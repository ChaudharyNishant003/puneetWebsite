"use server";
import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/auth/admin";
import { changeOrderStatus, addEvent } from "@/lib/orders";
import { shipOrder } from "@/lib/fulfilment";
import { sendSms } from "@/lib/integrations/sms";
import { requireAction } from "@/lib/flags";

type R = { ok: boolean; error?: string };

export async function setOrderStatusAction(orderId: string, to: OrderStatus, note?: string): Promise<R> {
  const u = await requireAdmin();
  await requireAction("orders");
  if (to === "CANCELLED") await requireAction("orderCancel");
  try {
    await changeOrderStatus(orderId, to, u.email, note);
    await audit(u.email, "order.status", "Order", orderId, { to, note });
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

export async function shipOrderAction(orderId: string, manual?: { courier: string; awb: string }): Promise<R> {
  const u = await requireAdmin();
  await requireAction("orders");
  if (manual?.awb) await requireAction("manualAwb");
  else {
    const o = await db.order.findUniqueOrThrow({ where: { id: orderId }, select: { deliveryMode: true } });
    await requireAction(o.deliveryMode === "LOCAL" ? "localDelivery" : "courier");
  }
  try {
    await shipOrder(orderId, u.email, manual?.awb ? manual : undefined);
    await audit(u.email, "order.ship", "Order", orderId, manual);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

export async function addOrderNoteAction(orderId: string, note: string): Promise<R> {
  const u = await requireAdmin();
  await requireAction("orderNotes");
  const n = note.trim().slice(0, 500);
  if (!n) return { ok: false, error: "Write a note" };
  await addEvent(orderId, "NOTE", u.email, n);
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

export async function markRefundedAction(orderId: string): Promise<R> {
  const u = await requireAdmin();
  await requireAction("orderCancel");
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (o.paymentStatus !== "PAID") return { ok: false, error: "Only paid orders can be marked refunded" };
  await db.order.update({ where: { id: orderId }, data: { paymentStatus: "REFUNDED" } });
  await addEvent(orderId, "REFUNDED", u.email, "Refund issued (outside the site)");
  await audit(u.email, "order.refunded", "Order", orderId);
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

export async function unblockCodAction(customerId: string): Promise<R> {
  const u = await requireAdmin("OWNER");
  await requireAction("codRto");
  await db.customer.update({ where: { id: customerId }, data: { codBlocked: false, rtoCount: 0 } });
  await audit(u.email, "customer.cod_unblock", "Customer", customerId);
  return { ok: true };
}

// Exchanges
export async function setExchangeStatusAction(id: string, status: "APPROVED" | "PICKED_UP" | "COMPLETED" | "REJECTED", adminNote?: string): Promise<R> {
  const u = await requireAdmin();
  await requireAction("exchanges");
  const ex = await db.exchangeRequest.findUniqueOrThrow({ where: { id }, include: { orderItem: { include: { order: true, variant: true } } } });
  await db.$transaction(async (tx) => {
    await tx.exchangeRequest.update({ where: { id }, data: { status, adminNote: adminNote?.slice(0, 500) } });
    // On completion, move stock: returned size back in, new size out.
    if (status === "COMPLETED" && ex.newSize && !ex.isDefect) {
      const newV = await tx.variant.findFirst({ where: { productId: ex.orderItem.variant.productId, size: ex.newSize, colour: ex.newColour ?? ex.orderItem.colour } });
      await tx.variant.update({ where: { id: ex.orderItem.variantId }, data: { stock: { increment: ex.orderItem.qty } } });
      if (newV) await tx.variant.update({ where: { id: newV.id }, data: { stock: { decrement: Math.min(ex.orderItem.qty, newV.stock) } } });
    }
    await addEvent(ex.orderItem.orderId, `EXCHANGE_${status}`, u.email, `${ex.orderItem.productName}${ex.newSize ? ` → ${ex.newSize}` : ""}${adminNote ? ` · ${adminNote}` : ""}`, tx);
  });
  await sendSms(ex.orderItem.order.shipPhone, "EXCHANGE_UPDATE", { order: ex.orderItem.order.number, status: status.toLowerCase() }).catch(() => {});
  await audit(u.email, "exchange.status", "ExchangeRequest", id, { status });
  revalidatePath("/admin/exchanges");
  return { ok: true };
}

// Reviews
export async function setReviewStatusAction(id: string, status: "APPROVED" | "REJECTED"): Promise<R> {
  const u = await requireAdmin();
  await requireAction("reviews");
  const r = await db.review.update({ where: { id }, data: { status } });
  const agg = await db.review.aggregate({ where: { productId: r.productId, status: "APPROVED" }, _avg: { rating: true }, _count: true });
  await db.product.update({ where: { id: r.productId }, data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count } });
  await audit(u.email, "review.status", "Review", id, { status });
  revalidatePath("/admin/reviews");
  return { ok: true };
}
