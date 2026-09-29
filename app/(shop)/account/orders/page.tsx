import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth/session";
import { LoginGate } from "@/components/shop/LoginGate";
import { fmtDate, inr, statusLabel } from "@/lib/format";

export const metadata: Metadata = { title: "My Orders", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const s = await getCustomerSession();
  if (!s) return <LoginGate title="Log in to track your orders" />;
  const orders = await db.order.findMany({
    where: { customerId: s.sub, status: { not: "PENDING_PAYMENT" } },
    orderBy: { createdAt: "desc" },
    include: { items: { select: { image: true, productName: true }, take: 3 } },
    take: 50,
  });
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="eyebrow mb-4 text-lg">My Orders</h1>
      {!orders.length ? (
        <div className="py-10 text-center"><p>No orders yet.</p><Link href="/" className="btn btn-dark mt-4">Start shopping</Link></div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/order/${o.number}`} className="flex gap-3 border border-line p-3">
                <div className="flex -space-x-4">{o.items.map((i, k) => (i.image ? <img key={k} src={i.image} alt="" width={48} height={64} className="h-16 w-12 rounded border-2 border-white object-cover" /> : null))}</div>
                <div className="flex-1 text-sm">
                  <p className="font-medium">{o.number}</p>
                  <p className="text-xs text-muted">{fmtDate(o.createdAt, { day: "numeric", month: "short", year: "numeric" })} · {inr(o.total)} · {o.paymentMethod === "COD" ? "COD" : "Prepaid"}</p>
                  <p className="mt-1 text-xs font-semibold text-brand">{statusLabel[o.status]}{o.status !== "DELIVERED" && o.etaDate && !["CANCELLED", "RTO"].includes(o.status) ? ` · arriving by ${fmtDate(o.etaDate)}` : ""}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
