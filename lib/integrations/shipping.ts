import "server-only";
import { db } from "../db";

// Delivery quote: local pincodes (own delivery) first, else Shiprocket serviceability, else a mock.

export type DeliveryQuote = {
  serviceable: boolean;
  mode: "LOCAL" | "COURIER";
  etaDays: number;
  etaDate: Date;
  localFee?: number;
  codAllowed: boolean;
  city?: string | null;
  state?: string | null;
  message?: string;
};

export const shippingIsMock = () => !process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD;

function addBusinessDays(from: Date, days: number) {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) added++; // no Sunday deliveries
  }
  return d;
}

let srToken: { token: string; exp: number } | null = null;
async function shiprocketToken() {
  if (srToken && srToken.exp > Date.now()) return srToken.token;
  const res = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.SHIPROCKET_EMAIL, password: process.env.SHIPROCKET_PASSWORD }),
  });
  if (!res.ok) throw new Error("Shiprocket auth failed");
  const j = (await res.json()) as { token: string };
  srToken = { token: j.token, exp: Date.now() + 9 * 86400_000 };
  return j.token;
}

// Mock ETA by distance proxy: same first digit as the shop pincode = nearer.
function mockEtaDays(pincode: string) {
  const shopPin = process.env.NEXT_PUBLIC_SHOP_PINCODE ?? "302001";
  if (pincode.slice(0, 3) === shopPin.slice(0, 3)) return 2;
  if (pincode[0] === shopPin[0]) return 3;
  if (/^(7|8|9)/.test(pincode) || pincode.startsWith("19")) return 7; // North-east / J&K / far
  return 5;
}

export async function quoteDelivery(pincode: string, now = new Date()): Promise<DeliveryQuote> {
  if (!/^[1-9]\d{5}$/.test(pincode))
    return { serviceable: false, mode: "COURIER", etaDays: 0, etaDate: now, codAllowed: false, message: "Enter a valid 6-digit pincode" };

  const local = await db.pincode.findUnique({ where: { code: pincode } });
  if (local?.isLocal) {
    return {
      serviceable: true,
      mode: "LOCAL",
      etaDays: local.localEtaDays,
      etaDate: addBusinessDays(now, local.localEtaDays),
      localFee: local.localFee,
      codAllowed: local.codAllowed,
      city: local.city,
      state: local.state,
    };
  }

  if (shippingIsMock()) {
    const days = mockEtaDays(pincode);
    return {
      serviceable: true,
      mode: "COURIER",
      etaDays: days,
      etaDate: addBusinessDays(now, days),
      codAllowed: local ? local.codAllowed : true,
      city: local?.city,
      state: local?.state,
    };
  }

  const token = await shiprocketToken();
  const url = new URL("https://apiv2.shiprocket.in/v1/external/courier/serviceability/");
  url.searchParams.set("pickup_postcode", process.env.NEXT_PUBLIC_SHOP_PINCODE ?? "302001");
  url.searchParams.set("delivery_postcode", pincode);
  url.searchParams.set("weight", "0.5");
  url.searchParams.set("cod", "1");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const j = (await res.json()) as {
    data?: { available_courier_companies?: { estimated_delivery_days: string; cod: number; city: string; state: string }[] };
  };
  const list = j.data?.available_courier_companies ?? [];
  if (!list.length) return { serviceable: false, mode: "COURIER", etaDays: 0, etaDate: now, codAllowed: false, message: "Sorry, we don't deliver to this pincode yet" };
  const best = list.reduce((a, b) => (Number(a.estimated_delivery_days) <= Number(b.estimated_delivery_days) ? a : b));
  const days = Number(best.estimated_delivery_days) + 1; // +1 for packing
  return {
    serviceable: true,
    mode: "COURIER",
    etaDays: days,
    etaDate: addBusinessDays(now, days),
    codAllowed: list.some((c) => c.cod === 1) && (local ? local.codAllowed : true),
    city: best.city,
    state: best.state,
  };
}

export { addBusinessDays, shiprocketToken };
