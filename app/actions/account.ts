"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalisePhone, requestOtp, verifyOtp } from "@/lib/auth/otp";
import { clearCustomerSession, getCustomerSession, setCustomerSession } from "@/lib/auth/session";

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "local";
}

export async function requestLoginOtpAction(rawPhone: string) {
  const phone = normalisePhone(rawPhone);
  if (!phone) return { ok: false as const, error: "Enter a valid 10-digit mobile number" };
  const r = await requestOtp(phone, "LOGIN", await ip());
  return r.ok ? { ok: true as const, phone, devCode: r.devCode } : r;
}

export async function verifyLoginOtpAction(rawPhone: string, code: string, localWishlist: string[] = []) {
  const phone = normalisePhone(rawPhone);
  if (!phone || !/^\d{6}$/.test(code.trim())) return { ok: false as const, error: "Enter the 6-digit OTP" };
  const r = await verifyOtp(phone, "LOGIN", code);
  if (!r.ok) return r;
  const customer = await db.customer.upsert({ where: { phone }, create: { phone }, update: {} });
  await setCustomerSession(customer.id, phone);
  const ids = z.array(z.string().max(40)).max(100).safeParse(localWishlist);
  if (ids.success && ids.data.length) {
    const existing = await db.product.findMany({ where: { id: { in: ids.data } }, select: { id: true } });
    await db.wishlistItem.createMany({ data: existing.map((p) => ({ customerId: customer.id, productId: p.id })), skipDuplicates: true });
  }
  const wishlist = await db.wishlistItem.findMany({ where: { customerId: customer.id }, select: { productId: true } });
  revalidatePath("/", "layout");
  return { ok: true as const, isNew: !customer.name, wishlist: wishlist.map((w) => w.productId) };
}

export async function logoutAction() {
  await clearCustomerSession();
  redirect("/");
}

export async function toggleWishlistAction(productId: string, on: boolean) {
  const s = await getCustomerSession();
  if (!s) return { ok: true, local: true };
  if (on) {
    const exists = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (exists) await db.wishlistItem.upsert({ where: { customerId_productId: { customerId: s.sub, productId } }, create: { customerId: s.sub, productId }, update: {} });
  } else await db.wishlistItem.deleteMany({ where: { customerId: s.sub, productId } });
  return { ok: true, local: false };
}

const profileSchema = z.object({ name: z.string().trim().min(2).max(60), email: z.string().trim().email().max(120).or(z.literal("")) });

export async function updateProfileAction(_: unknown, form: FormData) {
  const s = await getCustomerSession();
  if (!s) return { ok: false, error: "Please log in again" };
  const p = profileSchema.safeParse({ name: form.get("name"), email: form.get("email") ?? "" });
  if (!p.success) return { ok: false, error: "Please enter your name (and a valid email if you add one)" };
  await db.customer.update({ where: { id: s.sub }, data: { name: p.data.name, email: p.data.email || null } });
  revalidatePath("/account");
  return { ok: true, error: null };
}

export async function deleteAddressAction(id: string) {
  const s = await getCustomerSession();
  if (!s) return;
  await db.address.deleteMany({ where: { id, customerId: s.sub } });
  revalidatePath("/account/addresses");
}
