"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth/session";
import { requestOtp, verifyOtp } from "@/lib/auth/otp";
import { getCart } from "@/lib/cart";
import { getShopSettings } from "@/lib/settings";
import { getFlags } from "@/lib/flags";
import { priceCart, codEligibility } from "@/lib/pricing";
import { quoteDelivery } from "@/lib/integrations/shipping";
import { createPaymentOrder, paymentsAreMock, verifyCheckoutSignature } from "@/lib/integrations/payments";
import { addEvent, afterPlaced, expireStalePendingOrders, markOrderPaid, newOrderNumber, notify, reserveStock, StockError } from "@/lib/orders";
import { addressSchema } from "@/lib/validation";
import { track } from "@/lib/events";
import { rateLimit } from "@/lib/rate-limit";
import { isDemoMode, shop } from "@/lib/config";

const placeSchema = z.object({
  address: addressSchema,
  saveAddress: z.boolean().default(true),
  paymentMethod: z.enum(["PREPAID", "COD"]),
  codOtp: z.string().optional(),
  quotedTotal: z.number().int(),
});

export type PlaceResult =
  | { ok: false; error: string; code?: "PRICE_CHANGED" | "COD_OTP_REQUIRED" | "STOCK" | "LOGIN" }
  | { ok: true; kind: "COD"; orderNumber: string }
  | { ok: true; kind: "PREPAID"; orderNumber: string; payment: { provider: "razorpay" | "mock"; orderId: string; amount: number; keyId: string | null; name: string; phone: string; email?: string } };

async function buildQuote(input: { pincode: string; paymentMethod: "PREPAID" | "COD" }, customerId: string) {
  const [cart, settings, delivery, prevOrders, customer] = await Promise.all([
    getCart(),
    getShopSettings(),
    quoteDelivery(input.pincode),
    db.order.count({ where: { customerId, status: { notIn: ["PENDING_PAYMENT", "CANCELLED"] } } }),
    db.customer.findUniqueOrThrow({ where: { id: customerId } }),
  ]);
  if (!cart || !cart.items.length) return { error: "Your bag is empty" as const };
  const flags = await getFlags();
  const coupon = cart.couponCode && flags.site("coupons") ? await db.coupon.findUnique({ where: { code: cart.couponCode } }) : null;
  const pricing = priceCart({
    lines: cart.items.map((i) => ({ unitPrice: i.variant.product.price, mrp: i.variant.product.mrp, qty: i.qty, gstRate: i.variant.product.gstRate })),
    coupon,
    paymentMethod: input.paymentMethod,
    delivery: delivery.serviceable ? { mode: delivery.mode, localFee: delivery.localFee } : null,
    isFirstOrder: prevOrders === 0,
    settings,
  });
  const cod = flags.site("cod")
    ? codEligibility({ total: pricing.total, settings, pincodeCodAllowed: delivery.codAllowed, customerCodBlocked: customer.codBlocked && flags.site("codRto") })
    : { allowed: false, reason: "Cash on Delivery is not available" };
  const online = flags.site("onlinePayment");
  return { cart, settings, delivery, pricing, cod, coupon, customer, online, codOtp: flags.site("codOtp"), savedAddresses: flags.site("savedAddresses") };
}

// Live quote for the checkout summary (delivery date, fees, prepaid saving, COD availability).
export async function quoteAction(pincode: string, paymentMethod: "PREPAID" | "COD") {
  const s = await getCustomerSession();
  if (!s) return { ok: false as const, error: "Please log in" };
  const q = await buildQuote({ pincode, paymentMethod }, s.sub);
  if ("error" in q) return { ok: false as const, error: q.error };
  const other = await buildQuote({ pincode, paymentMethod: paymentMethod === "PREPAID" ? "COD" : "PREPAID" }, s.sub);
  return {
    ok: true as const,
    serviceable: q.delivery.serviceable,
    deliveryMessage: q.delivery.message ?? null,
    mode: q.delivery.mode,
    etaDate: q.delivery.etaDate.toISOString(),
    pricing: q.pricing,
    cod: q.cod,
    online: q.online,
    prepaidSaving: "error" in other ? 0 : paymentMethod === "PREPAID" ? q.pricing.prepaidDiscount : other.pricing.prepaidDiscount,
    couponCode: q.coupon?.code ?? null,
  };
}

export async function sendCodOtpAction(phone: string) {
  const s = await getCustomerSession();
  if (!s) return { ok: false as const, error: "Please log in" };
  if (!/^[6-9]\d{9}$/.test(phone)) return { ok: false as const, error: "Enter a valid delivery phone number" };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local";
  return requestOtp(phone, "COD", ip);
}

export async function placeOrderAction(raw: z.input<typeof placeSchema>): Promise<PlaceResult> {
  const s = await getCustomerSession();
  if (!s) return { ok: false, error: "Please log in with your phone number to continue", code: "LOGIN" };
  if (!(await rateLimit(`place:${s.sub}`, 10, 10 * 60))) return { ok: false, error: "Too many attempts. Please wait a few minutes." };
  const parsed = placeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your details" };
  const input = parsed.data;
  // Live store without payment keys: refuse prepaid up front instead of creating an unpayable order.
  if (input.paymentMethod === "PREPAID" && paymentsAreMock() && !isDemoMode())
    return { ok: false, error: "Online payment is not available right now. Please choose Cash on Delivery." };
  await expireStalePendingOrders();

  const q = await buildQuote({ pincode: input.address.pincode, paymentMethod: input.paymentMethod }, s.sub);
  if ("error" in q) return { ok: false, error: q.error ?? "Your bag is empty" };
  if (!q.delivery.serviceable) return { ok: false, error: q.delivery.message ?? "We can't deliver to this pincode yet" };
  if (q.pricing.total !== input.quotedTotal) return { ok: false, error: "Prices were updated. Please review your order total and place the order again.", code: "PRICE_CHANGED" };

  if (input.paymentMethod === "PREPAID" && !q.online) return { ok: false, error: "Please choose Cash on Delivery" };
  if (input.paymentMethod === "COD") {
    if (!q.cod.allowed) return { ok: false, error: q.cod.reason ?? "COD is not available" };
    // Login OTP already verified the account phone; a different delivery phone needs its own OTP.
    if (q.codOtp && input.address.phone !== s.phone) {
      if (!input.codOtp) return { ok: false, error: `Enter the OTP sent to ${input.address.phone} to confirm Cash on Delivery`, code: "COD_OTP_REQUIRED" };
      const v = await verifyOtp(input.address.phone, "COD", input.codOtp);
      if (!v.ok) return { ok: false, error: v.error, code: "COD_OTP_REQUIRED" };
    }
  }

  const a = input.address;
  const email = a.email || q.customer.email || undefined;
  let order;
  try {
    order = await db.$transaction(async (tx) => {
      await reserveStock(tx, q.cart.items.map((i) => ({ variantId: i.variantId, qty: i.qty, name: i.variant.product.name, size: i.variant.size })));
      const o = await tx.order.create({
        data: {
          number: newOrderNumber(),
          customerId: s.sub,
          status: input.paymentMethod === "COD" ? "PLACED" : "PENDING_PAYMENT",
          paymentMethod: input.paymentMethod,
          paymentStatus: input.paymentMethod === "COD" ? "COD_PENDING" : "PENDING",
          deliveryMode: q.delivery.mode,
          subtotal: q.pricing.subtotal,
          discount: q.pricing.couponDiscount,
          prepaidDiscount: q.pricing.prepaidDiscount,
          shippingFee: q.pricing.shippingFee,
          codFee: q.pricing.codFee,
          total: q.pricing.total,
          taxTotal: q.pricing.taxTotal,
          couponCode: q.pricing.couponDiscount > 0 ? q.coupon?.code : null,
          shipName: a.name,
          shipPhone: a.phone,
          shipLine1: a.line1,
          shipLine2: a.line2 || null,
          shipLandmark: a.landmark || null,
          shipCity: a.city,
          shipState: a.state,
          shipPincode: a.pincode,
          email: email ?? null,
          etaDate: q.delivery.etaDate,
          placedAt: input.paymentMethod === "COD" ? new Date() : null,
          items: {
            create: q.cart.items.map((i) => {
              const p = i.variant.product;
              const img = p.images.find((im) => im.colour === i.variant.colour) ?? p.images[0];
              return {
                variantId: i.variantId, productName: p.name, productSlug: p.slug, size: i.variant.size, colour: i.variant.colour, sku: i.variant.sku,
                image: img?.url, hsn: p.hsn, gstRate: p.gstRate, unitPrice: p.price, mrp: p.mrp, qty: i.qty, isExchangeable: p.isExchangeable,
              };
            }),
          },
        },
      });
      await addEvent(o.id, o.status, "customer", input.paymentMethod === "COD" ? "COD order placed" : "Awaiting online payment", tx);
      if (input.paymentMethod === "COD") await afterPlaced(tx, o);
      if (input.saveAddress && q.savedAddresses) {
        const dup = await tx.address.findFirst({ where: { customerId: s.sub, pincode: a.pincode, line1: a.line1 } });
        if (!dup) await tx.address.create({ data: { customerId: s.sub, name: a.name, phone: a.phone, line1: a.line1, line2: a.line2 || null, landmark: a.landmark || null, city: a.city, state: a.state, pincode: a.pincode } });
      }
      if (!q.customer.name || (email && !q.customer.email)) await tx.customer.update({ where: { id: s.sub }, data: { name: q.customer.name ?? a.name, email: q.customer.email ?? email } });
      return o;
    });
  } catch (e) {
    if (e instanceof StockError) return { ok: false, error: `${e.message}. Please update your bag.`, code: "STOCK" };
    throw e;
  }

  await track("begin_checkout", { orderId: order.id, method: input.paymentMethod, total: order.total });
  if (input.paymentMethod === "COD") {
    await track("purchase", { orderId: order.id, total: order.total, method: "COD" });
    await notify(order, "PLACED");
    return { ok: true, kind: "COD", orderNumber: order.number };
  }

  const pay = await createPaymentOrder(order.total, order.number);
  await db.payment.create({ data: { orderId: order.id, provider: pay.provider, providerOrderId: pay.id, amount: order.total } });
  return {
    ok: true,
    kind: "PREPAID",
    orderNumber: order.number,
    payment: { provider: pay.provider, orderId: pay.id, amount: pay.amount, keyId: pay.keyId, name: a.name, phone: a.phone, email },
  };
}

export async function confirmPaymentAction(input: { providerOrderId: string; paymentId: string; signature: string }) {
  const s = await getCustomerSession();
  if (!s) return { ok: false as const, error: "Session expired" };
  if (!verifyCheckoutSignature(input.providerOrderId, input.paymentId, input.signature)) return { ok: false as const, error: "Payment could not be verified" };
  const pay = await db.payment.findUnique({ where: { providerOrderId: input.providerOrderId }, include: { order: true } });
  if (!pay || pay.order.customerId !== s.sub) return { ok: false as const, error: "Order not found" };
  const order = await markOrderPaid(input.providerOrderId, input.paymentId);
  if (order) await track("purchase", { orderId: order.id, total: order.total, method: "PREPAID" });
  return { ok: true as const, orderNumber: pay.order.number };
}

// Mock payments only (no Razorpay keys): simulate success/failure from the checkout page.
export async function mockPayAction(providerOrderId: string, succeed: boolean) {
  if (!paymentsAreMock() || !isDemoMode()) return { ok: false as const, error: "Mock payments are disabled" };
  if (!succeed) return paymentFailedAction(providerOrderId);
  return confirmPaymentAction({ providerOrderId, paymentId: `mock_pay_${Date.now()}`, signature: "mock_signature" });
}

// Customer closed/failed the payment: cancel the pending order and give stock back immediately.
export async function paymentFailedAction(providerOrderId: string) {
  const s = await getCustomerSession();
  const pay = await db.payment.findUnique({ where: { providerOrderId }, include: { order: { include: { items: true } } } });
  if (!s || !pay || pay.order.customerId !== s.sub) return { ok: false as const, error: "Order not found" };
  if (pay.order.status === "PENDING_PAYMENT") {
    const { restoreStock } = await import("@/lib/orders");
    await db.$transaction(async (tx) => {
      const r = await tx.order.updateMany({ where: { id: pay.orderId, status: "PENDING_PAYMENT" }, data: { status: "CANCELLED", paymentStatus: "FAILED" } });
      if (r.count) {
        await restoreStock(tx, pay.order.items);
        await tx.payment.update({ where: { id: pay.id }, data: { status: "failed" } });
        await addEvent(pay.orderId, "CANCELLED", "customer", "Payment failed or cancelled", tx);
      }
    });
  }
  return { ok: false as const, error: `Payment was not completed. Your bag is saved; you can try again or choose Cash on Delivery. Need help? Call ${shop.phone}.` };
}
