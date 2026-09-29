import { NextResponse } from "next/server";
import { quoteDelivery } from "@/lib/integrations/shipping";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const pin = new URL(req.url).searchParams.get("pin")?.trim() ?? "";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!(await rateLimit(`pin:${ip}`, 60, 60))) return NextResponse.json({ serviceable: false, message: "Too many checks, try again in a minute" }, { status: 429 });
  const q = await quoteDelivery(pin);
  return NextResponse.json({ ...q, etaDate: q.etaDate.toISOString() });
}
