import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listWhere, resolveCollection } from "@/lib/catalog";
import { parseListParams } from "@/lib/params";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") ?? "";
  const c = await resolveCollection(slug);
  if (!c) return NextResponse.json({ total: 0 });
  const lp = parseListParams(Object.fromEntries(url.searchParams));
  let where = c.where;
  if (slug === "sale") {
    const rows = await db.$queryRaw<{ id: string }[]>`SELECT id FROM "Product" WHERE mrp > price * 1.15`;
    where = { ...where, id: { in: rows.map((r) => r.id) } };
  }
  const total = await db.product.count({ where: listWhere(where, lp) });
  return NextResponse.json({ total });
}
