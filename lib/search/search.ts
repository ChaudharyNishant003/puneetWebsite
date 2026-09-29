import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { cardInclude } from "../catalog";
import { parseQuery, type ParsedQuery } from "./parse";

// Small catalogue (hundreds of products): pull candidates from Postgres, then rank in memory.
// Ranking beats hard AND-filtering for Hinglish queries where customers mix intent words.

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

// kurti <-> kurta, kurtis
const variantsOf = (t: string) => [...new Set([t, t.endsWith("i") ? t.slice(0, -1) + "a" : t, t.endsWith("a") ? t.slice(0, -1) + "i" : t])];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export async function searchProducts(raw: string, take = 48) {
  const parsed: ParsedQuery = parseQuery(raw.slice(0, 120), await synonyms());
  const corrected = await Promise.all(parsed.terms.map(correctTerm));
  const genders = parsed.attributes.gender ?? [];
  const colours = (parsed.attributes.colour ?? []).map(cap);
  const attrEntries = Object.entries(parsed.attributes).filter(([k]) => k !== "gender" && k !== "colour");

  const any: Prisma.ProductWhereInput[] = [];
  for (const t of corrected) for (const v of variantsOf(t)) any.push({ searchText: { contains: v, mode: "insensitive" } });
  for (const [k, vals] of attrEntries) any.push({ attributes: { some: { key: k, value: { in: vals } } } });
  if (colours.length) any.push({ variants: { some: { colour: { in: colours } } } });
  if (genders.length) any.push({ gender: { in: genders as ("WOMEN" | "MEN" | "KIDS")[] } });

  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    ...(parsed.maxPrice != null || parsed.minPrice != null ? { price: { lte: parsed.maxPrice, gte: parsed.minPrice } } : {}),
    ...(any.length ? { OR: any } : {}),
  };
  const candidates = await db.product.findMany({ where, include: { ...cardInclude, attributes: { select: { key: true, value: true } } }, take: 400 });

  const words = corrected.filter((t) => !t.includes(" "));
  const phrases = corrected.filter((t) => t.includes(" "));
  const wanted = words.length + (phrases.length ? 1 : 0) + attrEntries.length + (colours.length ? 1 : 0) + (genders.length ? 1 : 0);

  const scored = candidates.map((p) => {
    const name = p.name.toLowerCase();
    const tokens = name.split(/\s+/);
    let score = 0;
    let hits = 0;
    const hit = (n: number) => {
      score += n;
      hits++;
    };
    for (const t of words) {
      const vs = variantsOf(t);
      if (tokens.includes(t) || tokens.includes(`${t}s`)) hit(7);
      else if (vs.some((v) => tokens.includes(v))) hit(5);
      else if (vs.some((v) => name.includes(v))) hit(4);
      else if (vs.some((v) => p.searchText.includes(v))) hit(2);
    }
    if (phrases.length && phrases.some((ph) => p.searchText.includes(ph))) hit(3);
    for (const [k, vals] of attrEntries) if (p.attributes.some((a) => a.key === k && vals.includes(a.value))) hit(3);
    if (colours.length && p.variants.some((v) => colours.includes(v.colour))) hit(3);
    if (genders.length) {
      if (genders.includes(p.gender)) hit(3);
      else score -= 8; // "suit" should not surface men's kurtas
    }
    return { p, score, full: hits === wanted };
  });

  const ranked = scored
    .filter((s) => s.score > 0 || (!wanted && s.score === 0))
    .sort((a, b) => Number(b.full) - Number(a.full) || b.score - a.score || b.p.soldCount - a.p.soldCount);
  const items = ranked.slice(0, take).map(({ p }) => {
    const { attributes: _drop, ...card } = p;
    void _drop;
    return card;
  });
  const relaxed = items.length > 0 && !ranked[0].full && wanted > 1;
  const didYouMean = corrected.join(" ") !== parsed.terms.join(" ") ? corrected.join(" ") : null;
  return { items, parsed, relaxed, didYouMean };
}
