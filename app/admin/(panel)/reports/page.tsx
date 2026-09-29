import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { requirePage } from "@/lib/flags";
import { inr } from "@/lib/format";

export const metadata = { title: "Reports" };

export default async function Reports({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireAdmin("OWNER");
  await requirePage("reports");
  const days = Math.min(365, Math.max(1, Number((await searchParams).days) || 30));
  const since = new Date(Date.now() - days * 86400_000);
  const live = { placedAt: { gte: since }, status: { notIn: ["PENDING_PAYMENT", "CANCELLED"] as ("PENDING_PAYMENT" | "CANCELLED")[] } };
  const [sales, byMethod, rto, cancelled, top, funnel, daily] = await Promise.all([
    db.order.aggregate({ where: live, _sum: { total: true, discount: true, prepaidDiscount: true, taxTotal: true }, _count: true, _avg: { total: true } }),
    db.order.groupBy({ by: ["paymentMethod"], where: live, _count: true, _sum: { total: true } }),
    db.order.count({ where: { placedAt: { gte: since }, status: "RTO" } }),
    db.order.count({ where: { createdAt: { gte: since }, status: "CANCELLED" } }),
    db.orderItem.groupBy({ by: ["productName"], where: { order: live }, _sum: { qty: true, unitPrice: true }, orderBy: { _sum: { qty: "desc" } }, take: 10 }),
    db.eventLog.groupBy({ by: ["name"], where: { createdAt: { gte: since }, name: { in: ["view_item", "add_to_cart", "begin_checkout", "purchase"] } }, _count: true }),
    db.$queryRaw<{ day: Date; orders: bigint; revenue: bigint }[]>`
      SELECT date_trunc('day', "placedAt" AT TIME ZONE 'Asia/Kolkata') AS day, count(*) AS orders, coalesce(sum(total),0) AS revenue
      FROM "Order" WHERE "placedAt" >= ${since} AND status NOT IN ('PENDING_PAYMENT','CANCELLED')
      GROUP BY 1 ORDER BY 1 DESC LIMIT 31`,
  ]);
  const count = (n: string) => funnel.find((f) => f.name === n)?._count ?? 0;
  const cod = byMethod.find((m) => m.paymentMethod === "COD");
  const codShare = sales._count ? Math.round(((cod?._count ?? 0) / sales._count) * 100) : 0;
  const card = (label: string, value: string, sub?: string) => (<div className="border border-line bg-white p-4"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p>{sub ? <p className="text-[11px] text-muted">{sub}</p> : null}</div>);
  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Reports</h1>
        <div className="flex gap-1">{[7, 30, 90].map((d) => (<a key={d} href={`/admin/reports?days=${d}`} className={`rounded px-3 py-1.5 text-xs ${d === days ? "bg-dark text-white" : "bg-white"}`}>{d} days</a>))}</div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {card("Sales", inr(sales._sum.total ?? 0), `${sales._count} orders`)}
        {card("Average order", inr(Math.round(sales._avg.total ?? 0)))}
        {card("COD share", `${codShare}%`, `Prepaid ${100 - codShare}%`)}
        {card("RTO / cancelled", `${rto} / ${cancelled}`, "Returned to store / cancelled")}
        {card("Coupon discounts", inr(sales._sum.discount ?? 0))}
        {card("Prepaid discounts", inr(sales._sum.prepaidDiscount ?? 0))}
        {card("GST collected (incl.)", inr(sales._sum.taxTotal ?? 0))}
        {card("Conversion", count("view_item") ? `${((count("purchase") / count("view_item")) * 100).toFixed(1)}%` : "—", "Purchases ÷ product views")}
      </div>
      <section className="border border-line bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">Shopping funnel</h2>
        <div className="grid grid-cols-4 gap-2 text-center text-sm">
          {[["view_item", "Product views"], ["add_to_cart", "Add to bag"], ["begin_checkout", "Checkout started"], ["purchase", "Purchases"]].map(([k, l]) => (<div key={k} className="bg-surface p-3"><p className="text-lg font-semibold">{count(k)}</p><p className="text-xs text-muted">{l}</p></div>))}
        </div>
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="border border-line bg-white">
          <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">Top products</h2>
          <table className="tbl"><tbody>{top.map((t) => (<tr key={t.productName}><td>{t.productName}</td><td className="text-right">{t._sum.qty} sold</td></tr>))}</tbody></table>
        </section>
        <section className="border border-line bg-white">
          <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">Daily sales</h2>
          <table className="tbl"><tbody>{daily.map((d) => (<tr key={String(d.day)}><td>{new Date(d.day).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td><td>{Number(d.orders)} orders</td><td className="text-right">{inr(Number(d.revenue))}</td></tr>))}</tbody></table>
        </section>
      </div>
    </div>
  );
}
