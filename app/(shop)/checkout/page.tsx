import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCart, cartSummary } from "@/lib/cart";
import { getCustomerSession } from "@/lib/auth/session";
import { CheckoutFlow } from "@/components/shop/CheckoutFlow";
import { paymentsAreMock } from "@/lib/integrations/payments";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [cart, session] = await Promise.all([getCart(), getCustomerSession()]);
  if (!cart || !cart.items.length) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="eyebrow text-lg">Your bag is empty</h1>
        <Link href="/c/new-arrivals" className="btn btn-dark mt-6">Continue shopping</Link>
      </div>
    );
  }
  const { pricing } = await cartSummary(cart);
  const customer = session ? await db.customer.findUnique({ where: { id: session.sub }, include: { addresses: { orderBy: { createdAt: "desc" } } } }) : null;
  const items = cart.items.map((i) => {
    const p = i.variant.product;
    return { id: i.id, name: p.name, size: i.variant.size, colour: i.variant.colour, qty: i.qty, price: p.price, image: (p.images.find((im) => im.colour === i.variant.colour) ?? p.images[0])?.url ?? null, isExchangeable: p.isExchangeable };
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-5">
      <h1 className="eyebrow mb-4 text-center text-lg">Checkout</h1>
      <CheckoutFlow
        loggedIn={!!customer}
        phone={session?.phone ?? null}
        name={customer?.name ?? ""}
        email={customer?.email ?? ""}
        addresses={(customer?.addresses ?? []).map((a) => ({ id: a.id, name: a.name, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", landmark: a.landmark ?? "", city: a.city, state: a.state, pincode: a.pincode }))}
        items={items}
        initialSubtotal={pricing.subtotal}
        mockPayments={paymentsAreMock()}
      />
    </div>
  );
}
