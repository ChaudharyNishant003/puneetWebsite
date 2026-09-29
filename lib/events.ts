import "server-only";
import { cookies } from "next/headers";
import { db } from "./db";
import { CART_COOKIE } from "./auth/session";

// First-party funnel log (view_item, add_to_cart, begin_checkout, purchase). Never blocks the request.
export async function track(name: string, props?: Record<string, unknown>) {
  try {
    const sessionId = (await cookies()).get(CART_COOKIE)?.value;
    await db.eventLog.create({ data: { name, props: props as object | undefined, sessionId } });
  } catch {
    /* analytics must never break shopping */
  }
}
