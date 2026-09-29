import Link from "next/link";
import type { OrderStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { fmtDateTime, inr, statusLabel } from "@/lib/format";

export const metadata = { title: "Orders" };

const TABS: [string, string][] = [["", "All"], ["PLACED", "To confirm"], ["CONFIRMED", "Confirmed"], ["PACKED", "Packed"], ["SHIPPED", "Shipped"], ["OUT_FOR_DELIVERY", "Out for delivery"], ["DELIVERED", "Delivered"], ["CANCELLED", "Cancelled"], ["RTO", "RTO"]];

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  await requireAdmin();
  const { status, q, page } = await searchParams;
  const p = Math.max(1, Number(page) || 1);
  const where: Prisma.OrderWhereInput = { status: status ? (status as OrderStatus) : { not: "PENDING_PAYMENT" } };
  if (q?.trim()) {
    const t = q.trim();
    where.OR = [{ number: { contains: t, mode: "insensitive" } }, { shipPhone: { contains: t } }, { shipName: { contains: t, mode: "insensitive" } }];
  }
  const [orders, total] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 30, skip: (p - 1) * 30, include: { _count: { select: { items: true } } } }),
    db.order.count({ where }),
  ]);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Orders</h1>
        <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Order no, phone or name" className="input w-60 py-2" />{status ? <input type="hidden" name="status" value={status} /> : null}<button className="btn btn-dark py-2">Search</button></form>
      </div>
      <div className="no-scrollbar mb-3 flex gap-1 overflow-x-auto">
        {TABS.map(([v, l]) => (<Link key={v} href={v ? `/admin/orders?status=${v}` : "/admin/orders"} className={`shrink-0 rounded px-3 py-1.5 text-xs ${(status ?? "") === v ? "bg-dark text-white" : "bg-white"}`}>{l}</Link>))}
      </div>
      <div className="overflow-x-auto border border-line bg-white">
        <table className="tbl min-w-[720px]">
          <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Delivery</th><th>Status</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`} className="font-medium text-brand">{o.number}</Link><br /><span className="text-xs text-muted">{fmtDateTime(o.createdAt)}</span>{o.isDemo ? <span className="ml-1 text-[10px] text-muted">(demo)</span> : null}</td>
                <td>{o.shipName}<br /><span className="text-xs text-muted">{o.shipPhone} · {o.shipCity}</span></td>
                <td>{o._count.items}</td>
                <td>{inr(o.total)}</td>
                <td className="text-xs">{o.paymentMethod}<br /><span className="text-muted">{o.paymentStatus.replace("_", " ").toLowerCase()}</span></td>
                <td className="text-xs">{o.deliveryMode === "LOCAL" ? "Local" : "Courier"}</td>
                <td className="text-xs font-semibold">{statusLabel[o.status]}{o.notes?.includes("Refund needed") ? <span className="block text-danger">Refund needed</span> : null}</td>
              </tr>
            ))}
            {!orders.length ? <tr><td colSpan={7} className="py-8 text-center text-muted">No orders</td></tr> : null}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>{total} orders</span>
        <span className="flex gap-2">
          {p > 1 ? <Link href={`/admin/orders?${new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}), page: String(p - 1) })}`} className="underline">Previous</Link> : null}
          {p * 30 < total ? <Link href={`/admin/orders?${new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}), page: String(p + 1) })}`} className="underline">Next</Link> : null}
        </span>
      </div>
    </div>
  );
}
