"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, hashPassword, requireAdmin } from "@/lib/auth/admin";
import { saveSettings } from "@/lib/settings";
import { defaultSettings } from "@/lib/config";
import { uploadMedia } from "@/lib/integrations/images";

type R = { ok: boolean; error: string | null };
const done = (path: string): R => {
  revalidatePath(path);
  return { ok: true, error: null };
};

// ---------- Coupons ----------
const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/, "Code: 3–20 letters/numbers"),
  description: z.string().trim().min(3).max(120),
  type: z.enum(["FLAT", "PERCENT"]),
  value: z.coerce.number().int().min(1).max(100000),
  minCart: z.coerce.number().int().min(0).default(0),
  maxDiscount: z.coerce.number().int().min(0).optional(),
  usageLimit: z.coerce.number().int().min(1).optional(),
  endsAt: z.string().optional(),
  prepaidOnly: z.boolean(),
  firstOrderOnly: z.boolean(),
});

export async function saveCouponAction(_: unknown, form: FormData): Promise<R> {
  const u = await requireAdmin();
  const raw = Object.fromEntries(form.entries());
  const p = couponSchema.safeParse({ ...raw, maxDiscount: raw.maxDiscount || undefined, usageLimit: raw.usageLimit || undefined, endsAt: raw.endsAt || undefined, prepaidOnly: form.get("prepaidOnly") === "on", firstOrderOnly: form.get("firstOrderOnly") === "on" });
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid coupon" };
  if (p.data.type === "PERCENT" && p.data.value > 90) return { ok: false, error: "Percent coupons can be at most 90%" };
  const data = { ...p.data, endsAt: p.data.endsAt ? new Date(`${p.data.endsAt}T23:59:59+05:30`) : null, maxDiscount: p.data.maxDiscount ?? null, usageLimit: p.data.usageLimit ?? null };
  await db.coupon.upsert({ where: { code: data.code }, create: data, update: data });
  await audit(u.email, "coupon.save", "Coupon", data.code, data);
  return done("/admin/coupons");
}

export async function toggleCouponAction(code: string, active: boolean): Promise<R> {
  const u = await requireAdmin();
  await db.coupon.update({ where: { code }, data: { active } });
  await audit(u.email, "coupon.toggle", "Coupon", code, { active });
  return done("/admin/coupons");
}

// ---------- Pincodes ----------
export async function savePincodesAction(_: unknown, form: FormData): Promise<R> {
  const u = await requireAdmin();
  const codes = String(form.get("codes") ?? "").split(/[\s,]+/).map((c) => c.trim()).filter(Boolean);
  const bad = codes.filter((c) => !/^[1-9]\d{5}$/.test(c));
  if (bad.length) return { ok: false, error: `Invalid pincodes: ${bad.slice(0, 5).join(", ")}` };
  if (!codes.length) return { ok: false, error: "Enter at least one pincode" };
  const isLocal = form.get("isLocal") === "on";
  const localFee = Math.max(0, Number(form.get("localFee")) || 0);
  const localEtaDays = Math.min(10, Math.max(0, Number(form.get("localEtaDays")) || 1));
  const codAllowed = form.get("codAllowed") === "on";
  const city = String(form.get("city") ?? "").trim() || null;
  for (const code of codes) {
    await db.pincode.upsert({ where: { code }, create: { code, isLocal, localFee, localEtaDays, codAllowed, city }, update: { isLocal, localFee, localEtaDays, codAllowed, ...(city ? { city } : {}) } });
  }
  await audit(u.email, "pincode.save", "Pincode", undefined, { count: codes.length, isLocal, localFee, codAllowed });
  return done("/admin/pincodes");
}

export async function deletePincodeAction(code: string): Promise<R> {
  const u = await requireAdmin();
  await db.pincode.delete({ where: { code } });
  await audit(u.email, "pincode.delete", "Pincode", code);
  return done("/admin/pincodes");
}

// ---------- Homepage content & search synonyms ----------
export async function saveAnnouncementAction(_: unknown, form: FormData): Promise<R> {
  const u = await requireAdmin();
  const text = String(form.get("text") ?? "").trim().slice(0, 140);
  const link = String(form.get("link") ?? "").trim();
  if (!text) return { ok: false, error: "Write the announcement text" };
  if (link && (!link.startsWith("/") || link.startsWith("//"))) return { ok: false, error: "Link must start with / (a page on this site)" };
  await db.cmsBlock.upsert({ where: { key: "announcement" }, create: { key: "announcement", content: { text, link } }, update: { content: { text, link } } });
  await audit(u.email, "cms.announcement", "CmsBlock", "announcement", { text, link });
  return done("/");
}

export async function saveHeroAction(_: unknown, form: FormData): Promise<R> {
  const u = await requireAdmin();
  const current = (await db.cmsBlock.findUnique({ where: { key: "hero" } }))?.content as Record<string, string> | undefined;
  const href = String(form.get("href") ?? "/").trim();
  if (!href.startsWith("/") || href.startsWith("//")) return { ok: false, error: "Button link must start with /" };
  let image = form.get("removeImage") === "on" ? undefined : current?.image;
  const file = form.get("image");
  if (file instanceof File && file.size) {
    const up = await uploadMedia(file, "cms");
    if ("error" in up) return { ok: false, error: up.error };
    image = up.url;
  }
  const content = {
    title: String(form.get("title") ?? "").trim().slice(0, 60) || "New Season",
    subtitle: String(form.get("subtitle") ?? "").trim().slice(0, 120),
    cta: String(form.get("cta") ?? "").trim().slice(0, 24) || "Shop Now",
    href,
    from: /^#[0-9a-f]{6}$/i.test(String(form.get("from"))) ? String(form.get("from")) : "#C9727A",
    to: /^#[0-9a-f]{6}$/i.test(String(form.get("to"))) ? String(form.get("to")) : "#8E1B3A",
    ...(image ? { image } : {}),
  };
  await db.cmsBlock.upsert({ where: { key: "hero" }, create: { key: "hero", content }, update: { content } });
  await audit(u.email, "cms.hero", "CmsBlock", "hero", content);
  return done("/");
}

export async function saveRailsAction(_: unknown, form: FormData): Promise<R> {
  const u = await requireAdmin();
  const rails = [0, 1, 2]
    .map((i) => ({
      title: String(form.get(`title_${i}`) ?? "").trim().slice(0, 50),
      subtitle: String(form.get(`subtitle_${i}`) ?? "").trim().slice(0, 80),
      source: String(form.get(`source_${i}`) ?? ""),
    }))
    .filter((r) => r.title && ["storeBestseller", "new", "featured", "bestselling"].includes(r.source));
  await db.cmsBlock.upsert({ where: { key: "rails" }, create: { key: "rails", content: rails }, update: { content: rails } });
  await audit(u.email, "cms.rails", "CmsBlock", "rails", rails);
  return done("/");
}

export async function saveSynonymAction(_: unknown, form: FormData): Promise<R> {
  const u = await requireAdmin();
  const term = String(form.get("term") ?? "").trim().toLowerCase();
  const expandsTo = String(form.get("expandsTo") ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).slice(0, 6);
  if (!/^[a-z0-9-]{2,30}$/.test(term) || !expandsTo.length) return { ok: false, error: "Enter one word and what it should also search for" };
  await db.searchSynonym.upsert({ where: { term }, create: { term, expandsTo }, update: { expandsTo } });
  await audit(u.email, "synonym.save", "SearchSynonym", term, { expandsTo });
  return done("/admin/content");
}

export async function deleteSynonymAction(term: string): Promise<R> {
  await requireAdmin();
  await db.searchSynonym.delete({ where: { term } });
  return done("/admin/content");
}

// ---------- Settings (owner) ----------
export async function saveSettingsAction(_: unknown, form: FormData): Promise<R> {
  const u = await requireAdmin("OWNER");
  const values: Record<string, number> = {};
  for (const k of Object.keys(defaultSettings)) {
    const v = Number(form.get(k));
    if (!Number.isFinite(v) || v < 0 || v > 100000) return { ok: false, error: `Invalid value for ${k}` };
    values[k] = Math.round(v);
  }
  if (values.prepaidDiscountPercent > 20) return { ok: false, error: "Prepaid discount should be 20% or less" };
  if (values.exchangeWindowDays < 1 || values.exchangeWindowDays > 30) return { ok: false, error: "Exchange window must be 1–30 days" };
  await saveSettings(values);
  await audit(u.email, "settings.save", "Setting", undefined, values);
  revalidatePath("/", "layout");
  return { ok: true, error: null };
}

// ---------- Users (owner) ----------
const userSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(2).max(60),
  role: z.enum(["OWNER", "STAFF"]),
  password: z.string().min(10, "Password must be at least 10 characters").max(100),
});

export async function createAdminUserAction(_: unknown, form: FormData): Promise<R> {
  const u = await requireAdmin("OWNER");
  const p = userSchema.safeParse(Object.fromEntries(form.entries()));
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid details" };
  const exists = await db.adminUser.findUnique({ where: { email: p.data.email } });
  if (exists) return { ok: false, error: "A user with this email already exists" };
  await db.adminUser.create({ data: { email: p.data.email, name: p.data.name, role: p.data.role, passwordHash: await hashPassword(p.data.password) } });
  await audit(u.email, "user.create", "AdminUser", p.data.email, { role: p.data.role });
  return done("/admin/users");
}

export async function setAdminUserActiveAction(id: string, active: boolean): Promise<R> {
  const u = await requireAdmin("OWNER");
  if (id === u.id) return { ok: false, error: "You can't deactivate yourself" };
  await db.adminUser.update({ where: { id }, data: { active } });
  await audit(u.email, "user.active", "AdminUser", id, { active });
  return done("/admin/users");
}

export async function resetAdminPasswordAction(id: string, password: string): Promise<R> {
  const u = await requireAdmin("OWNER");
  if (password.length < 10) return { ok: false, error: "Password must be at least 10 characters" };
  await db.adminUser.update({ where: { id }, data: { passwordHash: await hashPassword(password) } });
  await audit(u.email, "user.password_reset", "AdminUser", id);
  return done("/admin/users");
}
