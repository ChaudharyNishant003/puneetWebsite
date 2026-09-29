import "server-only";
import type { Order, OrderItem } from "@prisma/client";
import { db } from "./db";
import { shop } from "./config";
import { shippingIsMock, shiprocketToken } from "./integrations/shipping";
import { addEvent, notify } from "./orders";

type FullOrder = Order & { items: OrderItem[] };

async function shiprocketCreate(o: FullOrder) {
  const token = await shiprocketToken();
  const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const created = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      order_id: o.number,
      order_date: (o.placedAt ?? o.createdAt).toISOString().slice(0, 16).replace("T", " "),
      pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION ?? "Primary",
      billing_customer_name: o.shipName,
      billing_last_name: "",
      billing_address: o.shipLine1,
      billing_address_2: [o.shipLine2, o.shipLandmark].filter(Boolean).join(", "),
      billing_city: o.shipCity,
      billing_pincode: o.shipPincode,
      billing_state: o.shipState,
      billing_country: "India",
      billing_email: o.email ?? shop.email,
      billing_phone: o.shipPhone,
      shipping_is_billing: true,
      order_items: o.items.map((i) => ({ name: `${i.productName} ${i.colour} ${i.size}`, sku: i.sku, units: i.qty, selling_price: i.unitPrice, hsn: i.hsn, tax: i.gstRate })),
      payment_method: o.paymentMethod === "COD" ? "COD" : "Prepaid",
      shipping_charges: o.shippingFee,
      total_discount: o.discount + o.prepaidDiscount,
      sub_total: o.total,
      length: 30, breadth: 25, height: 4, weight: Math.max(0.3, o.items.reduce((s, i) => s + i.qty * 0.35, 0)),
    }),
  });
  if (!created.ok) throw new Error(`Shiprocket order failed (${created.status})`);
  const c = (await created.json()) as { shipment_id: number };
  const awbRes = await fetch("https://apiv2.shiprocket.in/v1/external/courier/assign/awb", { method: "POST", headers: h, body: JSON.stringify({ shipment_id: c.shipment_id }) });
  const a = (await awbRes.json()) as { response?: { data?: { awb_code?: string; courier_name?: string } } };
  const awb = a.response?.data?.awb_code ?? null;
  return { provider: "shiprocket", awb, courier: a.response?.data?.courier_name ?? null, trackingUrl: awb ? `https://shiprocket.co/tracking/${awb}` : null, externalId: String(c.shipment_id) };
}

// Hands the parcel over: courier booking (Shiprocket or mock) or own local delivery.
export async function shipOrder(orderId: string, actor: string, manual?: { courier: string; awb: string }) {
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (!["CONFIRMED", "PACKED"].includes(o.status)) throw new Error("Confirm and pack the order before shipping");
  let s: { provider: string; awb: string | null; courier: string | null; trackingUrl: string | null };
  if (manual) s = { provider: "manual", awb: manual.awb, courier: manual.courier, trackingUrl: null };
  else if (o.deliveryMode === "LOCAL") s = { provider: "local", awb: null, courier: "Store delivery", trackingUrl: null };
  else if (shippingIsMock()) s = { provider: "mock", awb: `MOCK${Date.now().toString().slice(-9)}`, courier: "Mock Express", trackingUrl: null };
  else s = await shiprocketCreate(o);

  const status = o.deliveryMode === "LOCAL" ? "OUT_FOR_DELIVERY" : "SHIPPED";
  const updated = await db.$transaction(async (tx) => {
    await tx.shipment.upsert({
      where: { orderId },
      create: { orderId, provider: s.provider, awb: s.awb, courier: s.courier, trackingUrl: s.trackingUrl, status: "created", history: [{ at: new Date().toISOString(), status: "created" }] },
      update: { provider: s.provider, awb: s.awb, courier: s.courier, trackingUrl: s.trackingUrl },
    });
    const u = await tx.order.update({ where: { id: orderId }, data: { status } });
    await addEvent(orderId, status, actor, s.awb ? `${s.courier} AWB ${s.awb}` : s.courier ?? undefined, tx);
    return u;
  });
  await notify(updated, "SHIPPED", { trackingUrl: s.trackingUrl });
  return updated;
}
