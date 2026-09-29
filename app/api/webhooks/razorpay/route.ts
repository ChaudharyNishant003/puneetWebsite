import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/integrations/payments";
import { markOrderPaid } from "@/lib/orders";

// Razorpay → payment.captured / order.paid. Backs up the browser callback (e.g. user closed the tab).
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"))) return NextResponse.json({ ok: false }, { status: 401 });
  const body = JSON.parse(raw) as { event: string; payload?: { payment?: { entity?: { id: string; order_id: string } } } };
  const p = body.payload?.payment?.entity;
  if ((body.event === "payment.captured" || body.event === "order.paid") && p?.order_id) {
    await markOrderPaid(p.order_id, p.id, body);
  }
  return NextResponse.json({ ok: true });
}
