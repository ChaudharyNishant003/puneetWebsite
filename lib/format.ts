export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export const savePercent = (price: number, mrp: number) => (mrp > price ? Math.round((1 - price / mrp) * 100) : 0);

export const fmtDate = (d: Date | string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) =>
  new Date(d).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", ...opts });

export const fmtDateTime = (d: Date | string) =>
  new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export const statusLabel: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PLACED: "Order placed",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RTO: "Returned to store",
};

export function slugify(t: string) {
  return t.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
