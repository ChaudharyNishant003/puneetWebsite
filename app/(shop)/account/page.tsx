import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth/session";
import { logoutAction } from "@/app/actions/account";
import { LoginGate } from "@/components/shop/LoginGate";
import { ProfileForm } from "@/components/shop/ProfileForm";
import { fmtDate, inr, statusLabel } from "@/lib/format";

export const metadata: Metadata = { title: "My Account", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const s = await getCustomerSession();
  if (!s) return <LoginGate title="Log in or sign up" />;
  const c = await db.customer.findUnique({ where: { id: s.sub }, include: { orders: { where: { status: { not: "PENDING_PAYMENT" } }, orderBy: { createdAt: "desc" }, take: 3 }, _count: { select: { orders: true, addresses: true, wishlist: true } } } });
  if (!c) return <LoginGate title="Log in or sign up" />;
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="eyebrow text-lg">Hi{c.name ? `, ${c.name.split(" ")[0]}` : ""}</h1>
      <p className="text-sm text-muted">+91 {c.phone}</p>

      <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
        <Link href="/account/orders" className="border border-line p-3"><b className="block text-lg">{c._count.orders}</b>Orders</Link>
        <Link href="/wishlist" className="border border-line p-3"><b className="block text-lg">{c._count.wishlist}</b>Wishlist</Link>
        <Link href="/account/addresses" className="border border-line p-3"><b className="block text-lg">{c._count.addresses}</b>Addresses</Link>
      </div>

      {c.orders.length ? (
        <section className="mt-6">
          <h2 className="eyebrow mb-2 text-sm">Recent orders</h2>
          <ul className="divide-y divide-line border border-line">
            {c.orders.map((o) => (
              <li key={o.id}><Link href={`/order/${o.number}`} className="flex justify-between p-3 text-sm"><span>{o.number}<br /><span className="text-xs text-muted">{fmtDate(o.createdAt)} · {inr(o.total)}</span></span><span className="text-xs font-semibold text-brand">{statusLabel[o.status]}</span></Link></li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6 border border-line p-4">
        <h2 className="eyebrow mb-3 text-sm">Profile</h2>
        <ProfileForm name={c.name ?? ""} email={c.email ?? ""} />
      </section>

      <section className="mt-6 bg-surface p-4 text-sm">
        <p className="font-semibold">Loyalty points are coming soon</p>
        <p className="mt-1 text-xs text-muted">Your phone number will be your membership ID, online and at our store.</p>
      </section>

      <form action={logoutAction} className="mt-6"><button className="btn btn-outline w-full">Log out</button></form>
    </div>
  );
}
