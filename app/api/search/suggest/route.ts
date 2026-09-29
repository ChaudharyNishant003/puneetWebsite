import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/search/search";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ items: [] });
  const { items } = await searchProducts(q, 6);
  return NextResponse.json(
    { items: items.map((p) => ({ slug: p.slug, name: p.name, price: p.price, image: p.images[0]?.url ?? null })) },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
