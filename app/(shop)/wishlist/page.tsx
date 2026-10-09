import type { Metadata } from "next";
import { db } from "@/lib/db";
import { cardInclude } from "@/lib/catalog";
import { getCustomerSession } from "@/lib/auth/session";
import { WishlistGrid } from "@/components/shop/WishlistGrid";
import { requirePage } from "@/lib/flags";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  await requirePage("wishlist", "site");
  const s = await getCustomerSession();
  const items = s
    ? (await db.wishlistItem.findMany({ where: { customerId: s.sub }, orderBy: { createdAt: "desc" }, include: { product: { include: cardInclude } } })).map((w) => w.product)
    : null;
  return (
    <div className="mx-auto max-w-7xl px-4 py-5">
      <h1 className="eyebrow mb-5 text-center text-lg">Wishlist</h1>
      <WishlistGrid serverItems={items} loggedIn={!!s} />
    </div>
  );
}
