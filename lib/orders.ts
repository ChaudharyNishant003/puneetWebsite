import "server-only";
import crypto from "node:crypto";
import type { Order, OrderItem, OrderStatus, Prisma } from "@prisma/client";
import { db } from "./db";
import { shop } from "./config";
import { fmtDate, inr, statusLabel } from "./format";
import { sendSms } from "./integrations/sms";
import { sendEmail } from "./integrations/email";
import { getFlags } from "./flags";

export class StockError extends Error {}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function newOrderNumber(now = new Date()) {
  const d = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(2).replace(/-/g, "");
  return `PG${d}${crypto.randomInt(1000, 10000)}`;
}

// Decrement stock atomically; throws StockError if any line can't be fulfilled.
export async function reserveStock(tx: Prisma.TransactionClient, lines: { variantId: string; qty: number; name: string; size: string }[]) {
  for (const l of lines) {
    const r = await tx.variant.updateMany({ where: { id: l.variantId, stock: { gte: l.qty } }, data: { stock: { decrement: l.qty } } });
    if (r.count !== 1) throw new StockError(`${l.name} (${l.size}) just went out of stock`);
  }
}

export async function restoreStock(tx: Prisma.TransactionClient, items: Pick<OrderItem, "variantId" | "qty">[]) {
  for (const i of items) await tx.variant.update({ where: { id: i.variantId }, data: { stock: { increment: i.qty } } });
}

export async function addEvent(orderId: string, status: string, actor = "system", note?: string, tx: Prisma.TransactionClient = db) {
  await tx.orderEvent.create({ data: { orderId, status, actor, note } });
}

// Prepaid orders that never got paid: release stock after 30 minutes.
export async function expireStalePendingOrders() {
  const stale = await db.order.findMany({
    where: { status: "PENDING_PAYMENT", createdAt: { lt: new Date(Date.now() - 30 * 60_000) } },
    include: { items: true },
    take: 50,
  });
  for (const o of stale) {
    await db.$transaction(async (tx) => {
      const r = await tx.order.updateMany({ where: { id: o.id, status: "PENDING_PAYMENT" }, data: { status: "CANCELLED", paymentStatus: "FAILED" } });
      if (r.count) {
        await restoreStock(tx, o.items);
        await addEvent(o.id, "CANCELLED", "system", "Payment not completed in 30 minutes", tx);
      }
    });
  }
  return stale.length;
}

// Idempotent: safe to call from both the browser callback and the webhook.
export async function markOrderPaid(providerOrderId: string, providerPaymentId: string, raw?: unknown) {
  const payment = await db.payment.findUnique({ where: { providerOrderId }, include: { order: { include: { items: true } } } });
  if (!payment) return null;
  if (payment.status === "paid") return payment.order;
  const order = await db.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: payment.id }, data: { status: "paid", providerPaymentId, raw: raw === undefined ? undefined : (raw as object) } });
    let o: Order = payment.order;
    if (o.status === "CANCELLED") {
      // Paid after expiry: re-reserve stock if possible, otherwise flag for refund.
      try {
        await reserveStock(tx, payment.order.items.map((i) => ({ variantId: i.variantId, qty: i.qty, name: i.productName, size: i.size })));
      } catch {
        await addEvent(o.id, "CANCELLED", "system", "Paid after expiry but stock gone — REFUND NEEDED", tx);
        return tx.order.update({ where: { id: o.id }, data: { paymentStatus: "PAID", notes: "Refund needed: paid after cancellation" } });
      }
    }
    o = await tx.order.update({ where: { id: o.id }, data: { status: "PLACED", paymentStatus: "PAID", placedAt: new Date() } });
    await addEvent(o.id, "PLACED", "system", "Payment received", tx);
    await afterPlaced(tx, o);
    return o;
  });
  if (order.status === "PLACED") await notify(order, "PLACED");
  return order;
}

// Shared post-placement bookkeeping (coupon usage, sold counts, clear cart).
export async function afterPlaced(tx: Prisma.TransactionClient, o: Order) {
  if (o.couponCode) await tx.coupon.update({ where: { code: o.couponCode }, data: { usedCount: { increment: 1 } } }).catch(() => {});
  const items = await tx.orderItem.findMany({ where: { orderId: o.id }, include: { variant: { select: { productId: true } } } });
  for (const i of items) await tx.product.update({ where: { id: i.variant.productId }, data: { soldCount: { increment: i.qty } } });
  await tx.cartItem.deleteMany({ where: { cart: { customerId: o.customerId } } });
  await tx.cart.updateMany({ where: { customerId: o.customerId }, data: { couponCode: null } });
}

const TEMPLATES: Partial<Record<OrderStatus, "ORDER_PLACED" | "ORDER_SHIPPED" | "ORDER_DELIVERED">> = {
  PLACED: "ORDER_PLACED",
  SHIPPED: "ORDER_SHIPPED",
  DELIVERED: "ORDER_DELIVERED",
};

export async function notify(order: Order, status: OrderStatus, extra: { trackingUrl?: string | null } = {}) {
  const flags = await getFlags();
  const tpl = flags.site("sms") ? TEMPLATES[status] : undefined;
  const link = `${shop.siteUrl}/order/${order.number}`;
  if (tpl) await sendSms(order.shipPhone, tpl, { order: order.number, amount: String(order.total), link }).catch(() => {});
  if (!order.email || !flags.site("email")) return;
  const subject =
    status === "PLACED" ? `Order ${order.number} confirmed` : status === "SHIPPED" ? `Order ${order.number} is on the way` : status === "DELIVERED" ? `Order ${order.number} delivered` : `Order ${order.number}: ${statusLabel[status]}`;
  const items = await db.orderItem.findMany({ where: { orderId: order.id } });
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1a1a1a">
    <h2 style="color:#8e1b3a;letter-spacing:.1em">${shop.name.toUpperCase()}</h2>
    <p>Hi ${esc(order.shipName.split(" ")[0])},</p>
    <p>${
      status === "PLACED"
        ? `Thank you! Your order <b>${order.number}</b> is confirmed.${order.etaDate ? ` Expected delivery by <b>${fmtDate(order.etaDate)}</b>.` : ""}`
        : status === "SHIPPED"
          ? `Your order <b>${order.number}</b> has been shipped.${extra.trackingUrl ? ` <a href="${extra.trackingUrl}">Track it here</a>.` : ""}`
          : status === "DELIVERED"
            ? `Your order <b>${order.number}</b> has been delivered. Need a different size? You can request a free exchange from My Orders within the exchange window.`
            : `Your order <b>${order.number}</b> is now: ${statusLabel[status]}.`
    }</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">${items
      .map((i) => `<tr><td style="padding:6px 0;border-bottom:1px solid #eee">${esc(i.productName)} (${esc(i.colour)}, ${esc(i.size)}) × ${i.qty}</td><td style="text-align:right;border-bottom:1px solid #eee">${inr(i.unitPrice * i.qty)}</td></tr>`)
      .join("")}
      <tr><td style="padding:8px 0"><b>Total ${order.paymentMethod === "COD" ? "(pay on delivery)" : "(paid)"}</b></td><td style="text-align:right"><b>${inr(order.total)}</b></td></tr></table>
    <p><a href="${link}" style="display:inline-block;background:#8e1b3a;color:#fff;padding:10px 16px;text-decoration:none">View order</a></p>
    <p style="color:#6e6e73;font-size:12px">${[shop.name, shop.hasStore ? shop.address : "", shop.phone].filter(Boolean).join(" · ")}</p></div>`;
  await sendEmail(order.email, subject, html).catch(() => {});
}

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PLACED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "OUT_FOR_DELIVERY", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED", "RTO"],
  OUT_FOR_DELIVERY: ["DELIVERED", "RTO"],
  DELIVERED: [],
  CANCELLED: [],
  RTO: [],
};

export async function changeOrderStatus(orderId: string, to: OrderStatus, actor: string, note?: string) {
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, shipment: true } });
  if (!ALLOWED_TRANSITIONS[o.status].includes(to)) throw new Error(`Cannot move from ${statusLabel[o.status]} to ${statusLabel[to]}`);
  const updated = await db.$transaction(async (tx) => {
    const data: Prisma.OrderUpdateInput = { status: to };
    if (to === "DELIVERED") {
      data.deliveredAt = new Date();
      if (o.paymentMethod === "COD") data.paymentStatus = "COD_COLLECTED";
    }
    if (to === "CANCELLED" || to === "RTO") await restoreStock(tx, o.items);
    if (to === "RTO" && o.paymentMethod === "COD" && (await getFlags()).site("codRto")) {
      const c = await tx.customer.update({ where: { id: o.customerId }, data: { rtoCount: { increment: 1 } } });
      const settings = await tx.setting.findUnique({ where: { key: "codRtoBlockThreshold" } });
      const threshold = typeof settings?.value === "number" ? settings.value : 2;
      if (c.rtoCount >= threshold) await tx.customer.update({ where: { id: c.id }, data: { codBlocked: true } });
    }
    if (to === "CANCELLED" && o.paymentStatus === "PAID") data.notes = [o.notes, "Refund needed: prepaid order cancelled"].filter(Boolean).join(" · ");
    const u = await tx.order.update({ where: { id: orderId }, data });
    await addEvent(orderId, to, actor, note, tx);
    return u;
  });
  await notify(updated, to, { trackingUrl: o.shipment?.trackingUrl });
  return updated;
}
