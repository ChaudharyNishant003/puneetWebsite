import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cardInclude } from "@/lib/catalog";

// Card data for client-side lists (recently viewed, guest wishlist). Keeps the given id order.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ids = (url.searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 40);
  const slugs = (url.searchParams.get("slugs") ?? "").split(",").filter(Boolean).slice(0, 40);
  if (!ids.length && !slugs.length) return NextResponse.json({ items: [] });
  const items = await db.product.findMany({
    where: { status: "ACTIVE", OR: [{ id: { in: ids } }, { slug: { in: slugs } }] },
    include: cardInclude,
  });
  const order = ids.length ? ids : slugs;
  items.sort((a, b) => order.indexOf(ids.length ? a.id : a.slug) - order.indexOf(ids.length ? b.id : b.slug));
  return NextResponse.json({ items });
}
