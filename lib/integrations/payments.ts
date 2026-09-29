import "server-only";
import crypto from "node:crypto";

// Razorpay Orders API with a mock provider when keys are absent.

export const paymentsAreMock = () => !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET;

export async function createPaymentOrder(amountRupees: number, receipt: string) {
  if (paymentsAreMock()) {
    return { provider: "mock" as const, id: `mock_order_${crypto.randomBytes(8).toString("hex")}`, amount: amountRupees * 100, keyId: null };
  }
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountRupees * 100, currency: "INR", receipt }),
  });
  if (!res.ok) throw new Error(`Razorpay order failed: ${res.status}`);
  const j = (await res.json()) as { id: string; amount: number };
  return { provider: "razorpay" as const, id: j.id, amount: j.amount, keyId: process.env.RAZORPAY_KEY_ID! };
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  if (paymentsAreMock()) return signature === "mock_signature";
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return safeEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}
