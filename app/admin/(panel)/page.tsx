import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { expireStalePendingOrders } from "@/lib/orders";
import { fmtDateTime, inr, statusLabel } from "@/lib/format";
import { smsIsMock } from "@/lib/integrations/sms";
import { paymentsAreMock } from "@/lib/integrations/payments";
import { shippingIsMock } from "@/lib/integrations/shipping";
import { imagesAreMock } from "@/lib/integrations/images";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  await requireAdmin();
  await expireStalePendingOrders();
  const { denied } = await searchParams;
  const startOfDay = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) + "T00:00:00+05:30");
  const live = { status: { notIn: ["PENDING_PAYMENT", "CANCELLED"] as ("PENDING_PAYMENT" | "CANCELLED")[] } };
  const [today, toConfirm, toShip, exchanges, reviews, lowStock, recent] = await Promise.all([
    db.order.aggregate({ where: { ...live, placedAt: { gte: startOfDay } }, _sum: { total: true }, _count: true }),
    db.order.count({ where: { status: "PLACED" } }),
    db.order.count({ where: { status: { in: ["CONFIRMED", "PACKED"] } } }),
    db.exchangeRequest.count({ where: { status: "REQUESTED" } }),
    db.review.count({ where: { status: "PENDING" } }),
    db.variant.findMany({ where: { stock: { lte: 3 }, product: { status: "ACTIVE" } }, include: { product: { select: { name: true, id: true } } }, orderBy: { stock: "asc" }, take: 12 }),
    db.order.findMany({ where: { status: { not: "PENDING_PAYMENT" } }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  const mocks = [smsIsMock() && "SMS (MSG91)", paymentsAreMock() && "Payments (Razorpay)", shippingIsMock() && "Courier (Shiprocket)", imagesAreMock() && "Images (Cloudinary)", !process.env.RESEND_API_KEY && "Email (Resend)"].filter(Boolean);

  const tile = (label: string, value: string | number, href?: string, warn = false) => {
    const body = (<><p className="text-xs text-muted">{label}</p><p className={`mt-1 text-2xl font-semibold ${warn ? "text-brand" : ""}`}>{value}</p></>);
    return href ? <Link href={href} className="border border-line bg-white p-4 hover:border-dark">{body}</Link> : <div className="border border-line bg-white p-4">{body}</div>;
  };

  return (
    <div className="space-y-6">
      {denied ? <p className="bg-danger-soft p-3 text-sm text-danger">That page is for the owner only.</p> : null}
      {mocks.length ? <p className="bg-gold-soft p-3 text-xs">Test mode: {mocks.join(", ")} not connected yet — the site simulates them. Add keys in the environment to go live.</p> : null}
      <h1 className="text-xl font-semibold">Today</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tile("Orders today", today._count)}
        {tile("Sales today", inr(today._sum.total ?? 0))}
        {tile("To confirm", toConfirm, "/admin/orders?status=PLACED", toConfirm > 0)}
        {tile("To pack / ship", toShip, "/admin/orders?status=CONFIRMED", toShip > 0)}
        {tile("Exchange requests", exchanges, "/admin/exchanges", exchanges > 0)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line px-4 py-3"><h2 className="text-sm font-semibold">Recent orders</h2><Link href="/admin/orders" className="text-xs text-brand underline">All orders</Link></div>
          <table className="tbl">
            <tbody>
              {recent.map((o) => (
                <tr key={o.id}><td><Link href={`/admin/orders/${o.id}`} className="font-medium text-brand">{o.number}</Link><br /><span className="text-xs text-muted">{fmtDateTime(o.createdAt)}</span></td><td>{o.shipName}<br /><span className="text-xs text-muted">{o.shipCity}</span></td><td>{inr(o.total)}<br /><span className="text-xs text-muted">{o.paymentMethod}</span></td><td className="text-xs">{statusLabel[o.status]}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line px-4 py-3"><h2 className="text-sm font-semibold">Low stock</h2>{reviews ? <Link href="/admin/reviews" className="text-xs text-brand underline">{reviews} reviews to approve</Link> : null}</div>
          <table className="tbl">
            <tbody>
              {lowStock.map((v) => (
                <tr key={v.id}><td><Link href={`/admin/products/${v.product.id}`} className="text-brand">{v.product.name}</Link></td><td className="text-xs">{v.colour} · {v.size}</td><td className={v.stock === 0 ? "font-semibold text-danger" : ""}>{v.stock === 0 ? "Sold out" : `${v.stock} left`}</td></tr>
              ))}
              {!lowStock.length ? <tr><td className="text-muted">All good</td></tr> : null}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
