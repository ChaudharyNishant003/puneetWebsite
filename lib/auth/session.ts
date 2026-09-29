import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (32+ chars)");
  return new TextEncoder().encode(s);
};

export const CUSTOMER_COOKIE = "pg_session";
export const ADMIN_COOKIE = "pg_admin";
export const CART_COOKIE = "pg_cart";

type CustomerClaims = { sub: string; phone: string; kind: "customer" };
type AdminClaims = { sub: string; email: string; role: "OWNER" | "STAFF"; kind: "admin"; tv?: number; imp?: boolean };

async function sign(claims: Record<string, unknown>, days: number) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secret());
}

async function verify<T>(token: string | undefined, kind: string): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.kind === kind ? (payload as T) : null;
  } catch {
    return null;
  }
}

const cookieOpts = (days: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: days * 86400,
});

export async function setCustomerSession(id: string, phone: string) {
  const token = await sign({ sub: id, phone, kind: "customer" }, 60);
  (await cookies()).set(CUSTOMER_COOKIE, token, cookieOpts(60));
}

export async function getCustomerSession() {
  return verify<CustomerClaims>((await cookies()).get(CUSTOMER_COOKIE)?.value, "customer");
}

export async function clearCustomerSession() {
  (await cookies()).delete(CUSTOMER_COOKIE);
}

export async function setAdminSession(id: string, email: string, role: "OWNER" | "STAFF", tv = 0, imp = false) {
  const token = await sign({ sub: id, email, role, kind: "admin", tv, ...(imp ? { imp: true } : {}) }, 1);
  (await cookies()).set(ADMIN_COOKIE, token, cookieOpts(1));
}

export async function getAdminSession() {
  return verify<AdminClaims>((await cookies()).get(ADMIN_COOKIE)?.value, "admin");
}

export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export { verify as verifyToken };

// ---------- Ops console session (separate cookie; never read by admin code) ----------
export const OPS_COOKIE = "pg_o";
type OpsClaims = { sub: string; email: string; kind: "ops" };

export async function setOpsSession(id: string, email: string) {
  const token = await new SignJWT({ sub: id, email, kind: "ops" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("12h").sign(secret());
  (await cookies()).set(OPS_COOKIE, token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 12 * 3600 });
}

export async function getOpsSession() {
  return verify<OpsClaims>((await cookies()).get(OPS_COOKIE)?.value, "ops");
}

export async function clearOpsSession() {
  (await cookies()).delete(OPS_COOKIE);
}
