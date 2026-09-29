import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { cardInclude } from "../catalog";
import { parseQuery, type ParsedQuery } from "./parse";

// Small catalogue (< 1–2k products): full-text via Postgres + typo tolerance via an in-memory
// vocabulary built from product search text. No external search service needed.

let vocab: { words: string[]; at: number } | null = null;

async function vocabulary() {
  if (vocab && Date.now() - vocab.at < 5 * 60_000) return vocab.words;
  const rows = await db.product.findMany({ where: { status: "ACTIVE" }, select: { searchText: true } });
  const set = new Set<string>();
  for (const r of rows) for (const w of r.searchText.split(/[^a-z0-9-]+/)) if (w.length >= 3) set.add(w);
  vocab = { words: [...set], at: Date.now() };
  return vocab.words;
}

function lev(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

// "kurthi" -> "kurti", "sarre" -> "saree"
export async function correctTerm(term: string) {
  if (term.includes(" ") || term.length < 4) return term;
  const words = await vocabulary();
  if (words.includes(term)) return term;
  const stem = term.replace(/(es|s)$/, "");
  if (words.includes(stem)) return stem;
  const maxD = term.length <= 5 ? 1 : 2;
  let best = term;
  let bestD = maxD + 1;
  for (const w of words) {
    const d = lev(term, w);
    if (d < bestD) {
      best = w;
      bestD = d;
    }
  }
  return bestD <= maxD ? best : term;
}

async function synonyms() {
  const rows = await db.searchSynonym.findMany();
  return Object.fromEntries(rows.map((r) => [r.term, r.expandsTo]));
}

export async function buildSearch(raw: string): Promise<{ parsed: ParsedQuery; where: Prisma.ProductWhereInput; corrected: string[] }> {
  const parsed = parseQuery(raw.slice(0, 120), await synonyms());
  const corrected = await Promise.all(parsed.terms.map(correctTerm));
  const and: Prisma.ProductWhereInput[] = [{ status: "ACTIVE" }];

  // Each typed word must match somewhere (name/category/attributes/colour); multi-word synonyms are ORed.
  const single = corrected.filter((t) => !t.includes(" "));
  const phrases = corrected.filter((t) => t.includes(" "));
  for (const t of single) {
    const alt = t.endsWith("i") ? [t, t.slice(0, -1) + "a"] : t.endsWith("a") ? [t, t.slice(0, -1) + "i"] : [t]; // kurti <-> kurta
    and.push({ OR: alt.map((a) => ({ searchText: { contains: a, mode: "insensitive" as const } })) });
  }
  if (phrases.length) and.push({ OR: phrases.map((p) => ({ searchText: { contains: p, mode: "insensitive" as const } })) });

  for (const [key, vals] of Object.entries(parsed.attributes)) {
    if (key === "colour") and.push({ variants: { some: { colour: { in: vals.map((v) => v[0].toUpperCase() + v.slice(1)) } } } });
    else and.push({ attributes: { some: { key, value: { in: vals } } } });
  }
  if (parsed.maxPrice != null || parsed.minPrice != null) and.push({ price: { lte: parsed.maxPrice, gte: parsed.minPrice } });
  return { parsed, where: { AND: and }, corrected };
}

export async function searchProducts(raw: string, take = 48) {
  const { parsed, where, corrected } = await buildSearch(raw);
  let items = await db.product.findMany({ where, include: cardInclude, orderBy: [{ soldCount: "desc" }], take });
  let relaxed = false;
  // Nothing found: relax attribute filters and keep only the words.
  if (!items.length && (Object.keys(parsed.attributes).length || parsed.maxPrice)) {
    const words = corrected.filter(Boolean);
    if (words.length) {
      items = await db.product.findMany({
        where: { status: "ACTIVE", OR: words.map((w) => ({ searchText: { contains: w, mode: "insensitive" as const } })) },
        include: cardInclude,
        orderBy: { soldCount: "desc" },
        take,
      });
      relaxed = items.length > 0;
    }
  }
  const didYouMean = corrected.join(" ") !== parsed.terms.join(" ") ? corrected.join(" ") : null;
  return { items, parsed, relaxed, didYouMean };
}
