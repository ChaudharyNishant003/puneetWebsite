import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { fmtDateTime } from "@/lib/format";
import { setExchangeStatusAction } from "@/app/actions/admin-orders";
import { ActionButton } from "@/components/admin/ActionForm";

export const metadata = { title: "Exchanges" };

const NEXT: Record<string, ("APPROVED" | "PICKED_UP" | "COMPLETED" | "REJECTED")[]> = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["PICKED_UP", "COMPLETED"],
  PICKED_UP: ["COMPLETED"],
  COMPLETED: [],
  REJECTED: [],
};

export default async function Exchanges({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  await requireAdmin();
  const { all } = await searchParams;
  const list = await db.exchangeRequest.findMany({
    where: all ? {} : { status: { in: ["REQUESTED", "APPROVED", "PICKED_UP"] } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { orderItem: { include: { order: { select: { id: true, number: true, shipName: true, shipPhone: true, deliveryMode: true } } } } },
  });
  return (
    <div>
      <div className="mb-4 flex items-center justify-between"><h1 className="text-xl font-semibold">Exchanges</h1><Link href={all ? "/admin/exchanges" : "/admin/exchanges?all=1"} className="text-xs underline">{all ? "Show open only" : "Show all"}</Link></div>
      <p className="mb-3 text-xs text-muted">Completing a size exchange puts the returned size back in stock and takes the new size out. Customers get an SMS on every change.</p>
      <div className="overflow-x-auto border border-line bg-white">
        <table className="tbl min-w-[760px]">
          <thead><tr><th>Requested</th><th>Order / customer</th><th>Item</th><th>Request</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id}>
                <td className="text-xs">{fmtDateTime(e.createdAt)}</td>
                <td><Link href={`/admin/orders/${e.orderItem.order.id}`} className="text-brand">{e.orderItem.order.number}</Link><br /><span className="text-xs">{e.orderItem.order.shipName} · <a href={`tel:${e.orderItem.order.shipPhone}`}>{e.orderItem.order.shipPhone}</a></span></td>
                <td className="text-xs">{e.orderItem.productName}<br />{e.orderItem.colour} · {e.orderItem.size}</td>
                <td className="text-xs">{e.isDefect ? <b className="text-danger">Defect / wrong item</b> : <>Size → <b>{e.newSize}</b></>}{e.isFree ? " · free" : " · charge shipping"}<br /><span className="text-muted">{e.reason}</span></td>
                <td className="text-xs font-semibold">{e.status.replace("_", " ")}</td>
                <td className="space-x-2 whitespace-nowrap">{NEXT[e.status].map((s) => (<ActionButton key={s} action={setExchangeStatusAction.bind(null, e.id, s, undefined)} className={`text-xs underline ${s === "REJECTED" ? "text-danger" : "text-brand"}`} confirmText={s === "REJECTED" ? "Reject this request?" : undefined}>{s === "PICKED_UP" ? "Picked up" : s[0] + s.slice(1).toLowerCase()}</ActionButton>))}</td>
              </tr>
            ))}
            {!list.length ? <tr><td colSpan={6} className="py-8 text-center text-muted">No open exchange requests</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
