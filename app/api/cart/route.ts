import { NextResponse } from "next/server";
import { getCart, cartSummary } from "@/lib/cart";

export const dynamic = "force-dynamic";

export async function GET() {
  const cart = await getCart();
  const { pricing, count, coupon } = await cartSummary(cart, { delivery: { mode: "COURIER" } });
  return NextResponse.json({
    count,
    couponCode: cart?.couponCode ?? null,
    couponDescription: coupon?.description ?? null,
    pricing,
    items: (cart?.items ?? []).map((i) => {
      const p = i.variant.product;
      const img = p.images.find((im) => im.colour === i.variant.colour) ?? p.images[0];
      return {
        id: i.id,
        qty: i.qty,
        variantId: i.variantId,
        size: i.variant.size,
        colour: i.variant.colour,
        stock: i.variant.stock,
        name: p.name,
        slug: p.slug,
        price: p.price,
        mrp: p.mrp,
        image: img?.url ?? null,
        isExchangeable: p.isExchangeable,
        sizes: p.variants.filter((v) => v.colour === i.variant.colour).map((v) => ({ id: v.id, size: v.size, stock: v.stock })),
      };
    }),
  });
}
