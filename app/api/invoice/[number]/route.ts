import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession, getCustomerSession } from "@/lib/auth/session";
import { renderInvoice } from "@/lib/invoice";
import { isOn } from "@/lib/flags";

export async function GET(_: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const [customer, admin] = await Promise.all([getCustomerSession(), getAdminSession()]);
  const order = await db.order.findUnique({ where: { number }, include: { items: true } });
  if (!order || (!admin && order.customerId !== customer?.sub)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const allowed = admin ? await isOn("invoice", "admin") : await isOn("invoice", "site");
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status === "PENDING_PAYMENT") return NextResponse.json({ error: "Invoice available after payment" }, { status: 400 });
  const pdf = await renderInvoice(order);
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Invoice-${order.number}.pdf"`, "Cache-Control": "private, no-store" },
  });
}
