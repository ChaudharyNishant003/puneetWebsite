import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { getFlags, requirePage } from "@/lib/flags";
import { ALLOWED_TRANSITIONS } from "@/lib/orders";
import { fmtDateTime, inr, statusLabel } from "@/lib/format";
import { OrderActions, UnblockCod } from "@/components/admin/OrderActions";

export const metadata = { title: "Order" };

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  await requirePage("orders");
  const { id } = await params;
  const o = await db.order.findUnique({
    where: { id },
    include: { items: { include: { exchanges: true } }, events: { orderBy: { createdAt: "desc" } }, shipment: true, payments: true, customer: { include: { _count: { select: { orders: true } } } } },
  });
  if (!o) notFound();
  const flags = await getFlags();
  // Shipping itself goes through the ship action (courier booking / local dispatch).
  const next = ALLOWED_TRANSITIONS[o.status].filter((s) => s !== "SHIPPED" && (s !== "OUT_FOR_DELIVERY" || o.status === "SHIPPED"));

  return (
    <div className="max-w-5xl">
      <Link href="/admin/orders" className="text-xs text-muted underline">← Orders</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{o.number} <span className="ml-2 rounded bg-brand-soft px-2 py-0.5 text-sm text-brand">{statusLabel[o.status]}</span></h1>
        {flags.admin("invoice") ? <a href={`/api/invoice/${o.number}`} target="_blank" className="btn btn-outline py-2">Invoice PDF</a> : null}
      </div>
      {o.notes ? <p className="mt-3 bg-danger-soft p-3 text-sm text-danger">{o.notes}</p> : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <section className="border border-line bg-white">
            <table className="tbl">
              <thead><tr><th>Item</th><th>SKU</th><th>Qty</th><th>Price</th></tr></thead>
              <tbody>
                {o.items.map((i) => (
                  <tr key={i.id}>
                    <td className="flex gap-2">{i.image ? <img src={i.image} alt="" className="h-12 w-9 rounded object-cover" /> : null}<span>{i.productName}<br /><span className="text-xs text-muted">{i.colour} · <b>{i.size}</b></span>{i.exchanges.length ? <span className="block text-xs text-brand">Exchange: {i.exchanges.map((e) => `${e.newSize ?? "defect"} (${e.status.toLowerCase()})`).join(", ")}</span> : null}</span></td>
                    <td className="text-xs">{i.sku}</td><td>{i.qty}</td><td>{inr(i.unitPrice * i.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="space-y-1 p-4 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{inr(o.subtotal)}</dd></div>
              {o.discount ? <div className="flex justify-between"><dt>Coupon {o.couponCode}</dt><dd>−{inr(o.discount)}</dd></div> : null}
              {o.prepaidDiscount ? <div className="flex justify-between"><dt>Prepaid discount</dt><dd>−{inr(o.prepaidDiscount)}</dd></div> : null}
              <div className="flex justify-between"><dt>Shipping</dt><dd>{inr(o.shippingFee)}</dd></div>
              {o.codFee ? <div className="flex justify-between"><dt>COD fee</dt><dd>{inr(o.codFee)}</dd></div> : null}
              <div className="flex justify-between border-t border-line pt-1 font-semibold"><dt>Total</dt><dd>{inr(o.total)}</dd></div>
              <p className="text-xs text-muted">{o.paymentMethod} · {o.paymentStatus.replace("_", " ").toLowerCase()} · GST included {inr(o.taxTotal)}</p>
            </dl>
          </section>

          <OrderActions orderId={o.id} status={o.status} next={next} deliveryMode={o.deliveryMode} paid={o.paymentStatus === "PAID"} can={{ courier: flags.admin("courier"), localDelivery: flags.admin("localDelivery"), manualAwb: flags.admin("manualAwb"), cancel: flags.admin("orderCancel"), notes: flags.admin("orderNotes") }} />

          <section className="border border-line bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold">Timeline</h2>
            <ul className="space-y-1.5 text-xs">{o.events.map((e) => (<li key={e.id}><span className="text-muted">{fmtDateTime(e.createdAt)}</span> · <b>{statusLabel[e.status] ?? e.status}</b>{e.note ? ` · ${e.note}` : ""} <span className="text-muted">({e.actor})</span></li>))}</ul>
          </section>
        </div>

        <div className="space-y-4">
          <section className="border border-line bg-white p-4 text-sm">
            <h2 className="mb-2 font-semibold">Customer</h2>
            <p>{o.shipName}<br /><a href={`tel:${o.shipPhone}`} className="text-brand">{o.shipPhone}</a>{o.email ? <><br />{o.email}</> : null}</p>
            <p className="mt-2 text-xs text-muted">Account +91 {o.customer.phone} · {o.customer._count.orders} orders{o.customer.rtoCount ? ` · ${o.customer.rtoCount} RTO` : ""}{o.customer.codBlocked ? " · COD blocked" : ""}</p>
            {o.customer.codBlocked && user.role === "OWNER" && flags.admin("codRto") ? <UnblockCod customerId={o.customerId} /> : null}
          </section>
          <section className="border border-line bg-white p-4 text-sm">
            <h2 className="mb-2 font-semibold">Ship to</h2>
            <p>{o.shipLine1}{o.shipLine2 ? `, ${o.shipLine2}` : ""}{o.shipLandmark ? `, near ${o.shipLandmark}` : ""}<br />{o.shipCity}, {o.shipState} {o.shipPincode}</p>
            <p className="mt-2 text-xs text-muted">{o.deliveryMode === "LOCAL" ? "Local delivery by store" : "Courier"}{o.etaDate ? ` · promised by ${fmtDateTime(o.etaDate).split(",")[0]}` : ""}</p>
            {o.shipment ? <p className="mt-2 text-xs">Shipment: {o.shipment.courier} {o.shipment.awb ? `· AWB ${o.shipment.awb}` : ""} ({o.shipment.provider})</p> : null}
          </section>
          {o.payments.length ? (
            <section className="border border-line bg-white p-4 text-xs">
              <h2 className="mb-2 text-sm font-semibold">Payments</h2>
              {o.payments.map((p) => (<p key={p.id}>{p.provider} · {p.providerOrderId} · {p.providerPaymentId ?? "—"} · <b>{p.status}</b></p>))}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
