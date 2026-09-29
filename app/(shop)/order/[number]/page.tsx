import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { exchangeEligibility } from "@/lib/exchange";
import { fmtDate, fmtDateTime, inr, statusLabel } from "@/lib/format";
import { LoginGate } from "@/components/shop/LoginGate";
import { ExchangeButton, ReviewButton } from "@/components/shop/OrderItemActions";

export const metadata: Metadata = { title: "Order details", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ number: string }>; searchParams: Promise<{ placed?: string }> };

const STEPS = ["PLACED", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"] as const;

export default async function OrderPage({ params, searchParams }: Props) {
  const { number } = await params;
  const { placed } = await searchParams;
  const s = await getCustomerSession();
  if (!s) return <LoginGate title="Log in to see your order" />;
  const order = await db.order.findUnique({
    where: { number },
    include: { items: { include: { exchanges: true, review: true, variant: { select: { product: { select: { isInnerwear: true, variants: { select: { size: true, colour: true, stock: true } } } } } } } }, events: { orderBy: { createdAt: "asc" } }, shipment: true },
  });
  if (!order || order.customerId !== s.sub) notFound();
  const settings = await getSettings();
  const stepIdx = order.status === "OUT_FOR_DELIVERY" ? 3.5 : STEPS.indexOf(order.status as (typeof STEPS)[number]);
  const cancelled = order.status === "CANCELLED" || order.status === "RTO";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {placed && order.status !== "PENDING_PAYMENT" && !cancelled ? (
        <div className="mb-5 bg-brand-soft p-5 text-center">
          <p className="text-2xl">🎉</p>
          <h1 className="mt-1 text-lg font-semibold">Thank you! Your order is placed.</h1>
          <p className="mt-1 text-sm">Order <b>{order.number}</b>{order.etaDate ? <> · Delivery by <b>{fmtDate(order.etaDate, { weekday: "long", day: "numeric", month: "short" })}</b></> : null}</p>
          <p className="mt-1 text-xs text-muted">We&apos;ve sent the details by SMS{order.email ? " and email" : ""}.</p>
        </div>
      ) : (
        <h1 className="eyebrow mb-4 text-lg">Order {order.number}</h1>
      )}

      <div className="border border-line p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p>Placed {fmtDateTime(order.placedAt ?? order.createdAt)}</p>
          <span className={`px-2 py-0.5 text-xs font-semibold ${cancelled ? "bg-danger-soft text-danger" : order.status === "DELIVERED" ? "bg-green-50 text-save" : "bg-brand-soft text-brand"}`}>{statusLabel[order.status]}</span>
        </div>
        {!cancelled && order.status !== "PENDING_PAYMENT" ? (
          <ol className="mt-4 flex justify-between text-center text-[10.5px]" aria-label="Order progress">
            {STEPS.map((st, i) => (
              <li key={st} className="flex-1">
                <span className={`mx-auto mb-1 block h-2.5 w-2.5 rounded-full ${i <= stepIdx ? "bg-save" : "bg-line-strong"}`} />
                <span className={i <= stepIdx ? "font-semibold" : "text-muted"}>{statusLabel[st]}</span>
              </li>
            ))}
          </ol>
        ) : null}
        {order.shipment?.awb ? (
          <p className="mt-4 text-sm">Courier: {order.shipment.courier} · AWB {order.shipment.awb} {order.shipment.trackingUrl ? <a href={order.shipment.trackingUrl} target="_blank" rel="noopener" className="text-brand underline">Track</a> : null}</p>
        ) : null}
        {order.status === "PENDING_PAYMENT" ? <p className="mt-3 text-sm text-danger">Payment not completed yet. <Link href="/checkout" className="underline">Try again</Link></p> : null}
      </div>

      <h2 className="eyebrow mb-2 mt-6 text-sm">Items</h2>
      <ul className="divide-y divide-line border border-line">
        {order.items.map((i) => {
          const check = exchangeEligibility({
            deliveredAt: order.deliveredAt,
            isExchangeable: i.isExchangeable,
            isInnerwear: i.variant.product.isInnerwear,
            alreadyRequested: i.exchanges.some((e) => e.status !== "REJECTED" && e.status !== "COMPLETED"),
            windowDays: settings.exchangeWindowDays,
          });
          const sizes = i.variant.product.variants.filter((v) => v.colour === i.colour && v.size !== i.size && v.stock > 0).map((v) => v.size);
          return (
            <li key={i.id} className="flex gap-3 p-3 text-sm">
              <Link href={`/p/${i.productSlug}`}>{i.image ? <img src={i.image} alt="" width={60} height={80} className="h-20 w-15 rounded object-cover" /> : null}</Link>
              <div className="flex-1">
                <Link href={`/p/${i.productSlug}`} className="leading-snug">{i.productName}</Link>
                <p className="text-xs text-muted">{i.colour} · Size {i.size} · Qty {i.qty}</p>
                <p className="mt-0.5 font-medium">{inr(i.unitPrice * i.qty)}</p>
                {i.exchanges.map((e) => (<p key={e.id} className="mt-1 text-xs text-brand">Exchange {e.newSize ? `to ${e.newSize}` : ""}: {e.status.toLowerCase().replace("_", " ")}{e.isFree ? " · free" : ""}</p>))}
                <div className="mt-2 flex flex-wrap gap-2">
                  {check.eligible ? <ExchangeButton orderItemId={i.id} sizes={sizes} daysLeft={check.daysLeft!} free={i.exchanges.length === 0} /> : order.status === "DELIVERED" && check.reason ? <p className="text-[11px] text-muted">{check.reason}</p> : null}
                  {order.status === "DELIVERED" && !i.review ? <ReviewButton orderItemId={i.id} size={i.size} /> : null}
                  {i.review ? <p className="text-[11px] text-save">✓ You reviewed this ({i.review.status.toLowerCase()})</p> : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="border border-line p-4 text-sm">
          <h2 className="eyebrow mb-2 text-xs">Delivery address</h2>
          <p><b>{order.shipName}</b> · {order.shipPhone}<br />{order.shipLine1}{order.shipLine2 ? `, ${order.shipLine2}` : ""}{order.shipLandmark ? `, near ${order.shipLandmark}` : ""}<br />{order.shipCity}, {order.shipState} {order.shipPincode}</p>
        </div>
        <div className="border border-line p-4 text-sm">
          <h2 className="eyebrow mb-2 text-xs">Payment</h2>
          <dl className="space-y-1">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{inr(order.subtotal)}</dd></div>
            {order.discount ? <div className="flex justify-between text-save"><dt>Coupon {order.couponCode}</dt><dd>−{inr(order.discount)}</dd></div> : null}
            {order.prepaidDiscount ? <div className="flex justify-between text-save"><dt>Prepaid discount</dt><dd>−{inr(order.prepaidDiscount)}</dd></div> : null}
            <div className="flex justify-between"><dt>Delivery</dt><dd>{order.shippingFee ? inr(order.shippingFee) : "Free"}</dd></div>
            {order.codFee ? <div className="flex justify-between"><dt>COD fee</dt><dd>{inr(order.codFee)}</dd></div> : null}
            <div className="flex justify-between border-t border-line pt-1 font-semibold"><dt>Total</dt><dd>{inr(order.total)}</dd></div>
            <p className="text-xs text-muted">{order.paymentMethod === "COD" ? (order.paymentStatus === "COD_COLLECTED" ? "Paid on delivery" : "Pay on delivery (cash or UPI)") : order.paymentStatus === "PAID" ? "Paid online" : "Online payment pending"}</p>
          </dl>
          {order.status !== "PENDING_PAYMENT" && !cancelled ? <a href={`/api/invoice/${order.number}`} className="mt-3 inline-block text-xs text-brand underline">Download GST invoice (PDF)</a> : null}
        </div>
      </div>

      <details className="mt-6 text-sm">
        <summary className="cursor-pointer text-xs text-muted">Order history</summary>
        <ul className="mt-2 space-y-1 text-xs">{order.events.map((e) => (<li key={e.id}>{fmtDateTime(e.createdAt)} · {statusLabel[e.status] ?? e.status}{e.note ? ` · ${e.note}` : ""}</li>))}</ul>
      </details>
      <div className="mt-6 flex gap-2">
        <Link href="/account/orders" className="btn btn-outline">All orders</Link>
        <Link href="/" className="btn btn-dark">Continue shopping</Link>
      </div>
    </div>
  );
}
