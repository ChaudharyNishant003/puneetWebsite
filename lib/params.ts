import { FILTER_KEYS, type ListParams } from "./catalog";

export type SP = Record<string, string | string[] | undefined>;

const arr = (v: string | string[] | undefined) => (v == null ? [] : (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim()).filter(Boolean));
const num = (v: string | string[] | undefined) => {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export const PAGE_SIZE = 24;

export function parseListParams(sp: SP): ListParams & { page: number } {
  const attrs: ListParams["attrs"] = {};
  for (const k of FILTER_KEYS) {
    const v = arr(sp[k]);
    if (v.length) attrs[k] = v;
  }
  const sortRaw = typeof sp.sort === "string" ? sp.sort : undefined;
  const sort = (["recommended", "new", "price-asc", "price-desc", "bestselling"] as const).find((s) => s === sortRaw);
  const page = Math.min(Math.max(1, num(sp.page) ?? 1), 50);
  return { size: arr(sp.size), colour: arr(sp.colour), attrs, minPrice: num(sp.min), maxPrice: num(sp.max), sort, take: PAGE_SIZE * page, skip: 0, page };
}
