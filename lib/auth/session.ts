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
type AdminClaims = { sub: string; email: string; role: "OWNER" | "STAFF"; kind: "admin" };

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

export async function setAdminSession(id: string, email: string, role: "OWNER" | "STAFF") {
  const token = await sign({ sub: id, email, role, kind: "admin" }, 1);
  (await cookies()).set(ADMIN_COOKIE, token, cookieOpts(1));
}

export async function getAdminSession() {
  return verify<AdminClaims>((await cookies()).get(ADMIN_COOKIE)?.value, "admin");
}

export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export { verify as verifyToken };
