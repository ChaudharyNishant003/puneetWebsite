import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

export const cardInclude = {
  images: { orderBy: { sortOrder: "asc" }, take: 2 },
  variants: { orderBy: { sortOrder: "asc" }, select: { id: true, size: true, colour: true, colourHex: true, stock: true } },
  category: { select: { name: true, slug: true } },
} satisfies Prisma.ProductInclude;

export type CardProduct = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export const FILTER_KEYS = ["occasion", "fabric", "sleeve", "length", "pattern", "neck"] as const;

// Virtual collections shown in navigation alongside real categories.
export const virtualCollections: Record<string, { title: string; subtitle?: string; where: Prisma.ProductWhereInput }> = {
  "new-arrivals": { title: "New Arrivals", subtitle: "Is hafte dukaan mein aaya", where: {} },
  sale: { title: "Sale", subtitle: "Genuine MRP, genuine discounts", where: {} },
  "plus-size": { title: "Plus Size", where: { variants: { some: { size: { in: ["XXL", "3XL", "4XL"] } } } } },
  "occasion-daily": { title: "Daily Wear", where: { attributes: { some: { key: "occasion", value: "Daily" } } } },
  "occasion-office": { title: "Office Wear", where: { attributes: { some: { key: "occasion", value: "Office" } } } },
  "occasion-festive": { title: "Festive", subtitle: "Diwali, Eid, Teej aur har tyohaar ke liye", where: { attributes: { some: { key: "occasion", value: "Festive" } } } },
  "occasion-wedding": { title: "Wedding Guest", where: { attributes: { some: { key: "occasion", value: "Wedding Guest" } } } },
  "for-mother": { title: "Maa ke liye", subtitle: "Gifting edit", where: { attributes: { some: { key: "recipient", value: "Mother" } } } },
  "under-499": { title: "Under ₹499", where: { price: { lte: 499 } } },
  "under-999": { title: "Under ₹999", where: { price: { lte: 999 } } },
  "under-1499": { title: "Under ₹1,499", where: { price: { lte: 1499 } } },
  "under-2499": { title: "Under ₹2,499", where: { price: { lte: 2499 } } },
};

export const getMenu = cache(async () => {
  const cats = await db.category.findMany({
    where: { showInMenu: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, name: true, parentId: true },
  });
  const top = cats.filter((c) => !c.parentId);
  return top.map((t) => ({ ...t, children: cats.filter((c) => c.parentId === t.id) }));
});

export async function resolveCollection(slug: string) {
  const v = virtualCollections[slug];
  if (v) return { kind: "virtual" as const, slug, title: v.title, subtitle: v.subtitle, where: v.where, category: null };
  const cat = await db.category.findUnique({ where: { slug }, include: { children: { select: { id: true, slug: true, name: true } } } });
  if (!cat) return null;
  const ids = [cat.id, ...cat.children.map((c) => c.id)];
  return { kind: "category" as const, slug, title: cat.name, subtitle: cat.description ?? undefined, where: { categoryId: { in: ids } }, category: cat };
}

export type ListParams = {
  size?: string[];
  colour?: string[];
  attrs?: Partial<Record<(typeof FILTER_KEYS)[number], string[]>>;
  minPrice?: number;
  maxPrice?: number;
  sort?: "recommended" | "new" | "price-asc" | "price-desc" | "bestselling";
  take?: number;
  skip?: number;
};

export function listWhere(base: Prisma.ProductWhereInput, p: ListParams): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [base, { status: "ACTIVE" }];
  if (p.size?.length) and.push({ variants: { some: { size: { in: p.size }, stock: { gt: 0 } } } });
  if (p.colour?.length) and.push({ variants: { some: { colour: { in: p.colour } } } });
  for (const [k, vals] of Object.entries(p.attrs ?? {})) if (vals?.length) and.push({ attributes: { some: { key: k, value: { in: vals } } } });
  if (p.minPrice != null || p.maxPrice != null) and.push({ price: { gte: p.minPrice, lte: p.maxPrice } });
  return { AND: and };
}

export function listOrder(sort: ListParams["sort"], collectionSlug?: string): Prisma.ProductOrderByWithRelationInput[] {
  if (collectionSlug === "new-arrivals" && (!sort || sort === "recommended")) sort = "new";
  switch (sort) {
    case "new":
      return [{ createdAt: "desc" }];
    case "price-asc":
      return [{ price: "asc" }];
    case "price-desc":
      return [{ price: "desc" }];
    case "bestselling":
      return [{ soldCount: "desc" }];
    default:
      return [{ isFeatured: "desc" }, { storeBestseller: "desc" }, { soldCount: "desc" }, { createdAt: "desc" }];
  }
}

export async function listProducts(where: Prisma.ProductWhereInput, p: ListParams, collectionSlug?: string) {
  if (collectionSlug === "sale") {
    // Sale = markdowns of 15%+ only (column-to-column comparison needs raw SQL)
    const rows = await db.$queryRaw<{ id: string }[]>`SELECT id FROM "Product" WHERE mrp > price * 1.15`;
    where = { ...where, id: { in: rows.map((r) => r.id) } };
  }
  const w = listWhere(where, p);
  const [items, total] = await Promise.all([
    db.product.findMany({ where: w, include: cardInclude, orderBy: listOrder(p.sort, collectionSlug), take: p.take ?? 24, skip: p.skip ?? 0 }),
    db.product.count({ where: w }),
  ]);
  return { items, total };
}

// Facet values available inside a collection (for filter chips).
export async function facets(where: Prisma.ProductWhereInput) {
  const base: Prisma.ProductWhereInput = { AND: [where, { status: "ACTIVE" }] };
  const [variants, attrs, price] = await Promise.all([
    db.variant.findMany({ where: { product: base }, select: { size: true, colour: true, colourHex: true }, distinct: ["size", "colour"] }),
    db.productAttribute.findMany({ where: { product: base, key: { in: [...FILTER_KEYS] } }, select: { key: true, value: true }, distinct: ["key", "value"] }),
    db.product.aggregate({ where: base, _min: { price: true }, _max: { price: true } }),
  ]);
  const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "Free Size", "2-3Y", "4-5Y", "6-7Y", "8-9Y", "10-11Y", "28", "30", "32", "34", "36", "38", "32B", "34B", "36B", "38B"];
  const rank = (s: string) => (SIZE_ORDER.includes(s) ? SIZE_ORDER.indexOf(s) : 999);
  const sizes = [...new Set(variants.map((v) => v.size))].sort((a, b) => rank(a) - rank(b));
  const colourMap = new Map<string, string>();
  for (const v of variants) colourMap.set(v.colour, v.colourHex);
  const byKey: Record<string, string[]> = {};
  for (const a of attrs) (byKey[a.key] ??= []).push(a.value);
  for (const k of Object.keys(byKey)) byKey[k].sort();
  return {
    sizes,
    colours: [...colourMap.entries()].map(([name, hex]) => ({ name, hex })).sort((a, b) => a.name.localeCompare(b.name)),
    attrs: byKey,
    minPrice: price._min.price ?? 0,
    maxPrice: price._max.price ?? 0,
  };
}

export const getProduct = cache(async (slug: string) =>
  db.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { sortOrder: "asc" } },
      attributes: true,
      category: { include: { sizeChart: true, parent: { select: { name: true, slug: true } } } },
    },
  }),
);

export async function rail(source: string, take = 8) {
  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };
  if (source === "storeBestseller") where.storeBestseller = true;
  if (source === "featured") where.isFeatured = true;
  return db.product.findMany({
    where,
    include: cardInclude,
    orderBy: source === "new" ? { createdAt: "desc" } : { soldCount: "desc" },
    take,
  });
}
