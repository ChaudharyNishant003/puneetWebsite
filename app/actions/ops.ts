"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { checkOtp, checkPassword, findOrBootstrap, issueOtp, opsBase, opsEnabled, opsLog, ownerVisible, requireOps } from "@/lib/auth/ops";
import { clearAdminSession, clearOpsSession, setAdminSession, setOpsSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/admin";
import { FEATURES, featureByKey } from "@/lib/features";
import { invalidateControls, invalidateFlags, type Maintenance } from "@/lib/flags";

type R = { ok: boolean; error: string | null; step?: "otp"; shownCode?: string };
const GENERIC = "Wrong email or password";

async function gate() {
  const u = await requireOps();
  if (!u) throw new Error("Not found");
  return u;
}

async function ip() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

// ---------- Sign in: email + password, then emailed code ----------
export async function opsPasswordAction(_: unknown, form: FormData): Promise<R> {
  if (!opsEnabled()) return { ok: false, error: GENERIC };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!(await rateLimit(`ops:${email}`, 5, 30 * 60)) || !(await rateLimit(`ops-ip:${await ip()}`, 10, 30 * 60)))
    return { ok: false, error: "Too many attempts. Try again in 30 minutes." };
  const u = await findOrBootstrap(email);
  if (!u || !(await checkPassword(u.passwordHash, password))) return { ok: false, error: GENERIC };
  const r = await issueOtp(email);
  return { ok: true, error: null, step: "otp", shownCode: r.shownCode };
}

export async function opsOtpAction(_: unknown, form: FormData): Promise<R> {
  if (!opsEnabled()) return { ok: false, error: GENERIC };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const code = String(form.get("code") ?? "");
  if (!(await rateLimit(`ops-otp:${email}`, 8, 30 * 60))) return { ok: false, error: "Too many attempts. Try again in 30 minutes.", step: "otp" };
  const u = await db.opsUser.findUnique({ where: { email } });
  if (!u || !/^\d{6}$/.test(code.trim()) || !(await checkOtp(email, code))) return { ok: false, error: "Incorrect or expired code", step: "otp" };
  await db.opsUser.update({ where: { id: u.id }, data: { lastLoginAt: new Date() } });
  await setOpsSession(u.id, u.email);
  await opsLog("signin", { email });
  redirect(opsBase());
}

export async function opsLogoutAction() {
  await clearOpsSession();
  redirect(opsBase());
}

export async function opsChangePasswordAction(_: unknown, form: FormData): Promise<R> {
  const u = await gate();
  const cur = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (!(await checkPassword(u.passwordHash, cur))) return { ok: false, error: "Current password is wrong" };
  if (next.length < 14) return { ok: false, error: "Use at least 14 characters" };
  await db.opsUser.update({ where: { id: u.id }, data: { passwordHash: await hashPassword(next) } });
  await opsLog("password.change");
  return { ok: true, error: null };
}

// ---------- Feature switches ----------
export async function setFlagAction(key: string, side: "admin" | "site", on: boolean) {
  await gate();
  const f = featureByKey.get(key);
  if (!f || (side === "admin" && !f.admin) || (side === "site" && !f.site)) return { ok: false };
  await db.featureFlag.upsert({
    where: { key },
    create: { key, adminOn: side === "admin" ? on : true, siteOn: side === "site" ? on : true },
    update: side === "admin" ? { adminOn: on } : { siteOn: on },
  });
  invalidateFlags();
  await opsLog("flag", { key, side, on });
  await ownerVisible("plan.features_updated", "Plan");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setAllFlagsAction(mode: "on" | "off" | "default") {
  await gate();
  if (mode === "default" || mode === "on") await db.featureFlag.deleteMany();
  else
    await db.$transaction(
      FEATURES.filter((f) => !f.core).map((f) =>
        db.featureFlag.upsert({ where: { key: f.key }, create: { key: f.key, adminOn: false, siteOn: false }, update: { adminOn: false, siteOn: false } }),
      ),
    );
  invalidateFlags();
  await opsLog("flag.bulk", { mode });
  await ownerVisible("plan.features_updated", "Plan");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------- Site controls ----------
const maintSchema = z.object({ site: z.boolean(), admin: z.boolean(), message: z.string().trim().min(3).max(200) });

export async function setMaintenanceAction(m: Maintenance) {
  await gate();
  const p = maintSchema.safeParse(m);
  if (!p.success) return { ok: false, error: "Message must be 3–200 characters" };
  await db.siteControl.upsert({ where: { key: "maintenance" }, create: { key: "maintenance", value: p.data }, update: { value: p.data } });
  invalidateControls();
  await opsLog("maintenance", p.data);
  await ownerVisible(p.data.site || p.data.admin ? "site.maintenance_on" : "site.maintenance_off", "Site");
  revalidatePath("/", "layout");
  return { ok: true, error: null };
}

export async function setUserLimitAction(limit: number | null) {
  await gate();
  if (limit !== null && (!Number.isInteger(limit) || limit < 0 || limit > 50)) return { ok: false, error: "Limit must be 0–50 or empty" };
  if (limit === null) await db.siteControl.deleteMany({ where: { key: "userLimit" } });
  else await db.siteControl.upsert({ where: { key: "userLimit" }, create: { key: "userLimit", value: limit }, update: { value: limit } });
  invalidateControls();
  await opsLog("userLimit", { limit });
  await ownerVisible("plan.user_limit_updated", "Plan");
  return { ok: true, error: null };
}

// ---------- Admin accounts ----------
export async function setAdminLockAction(id: string, locked: boolean) {
  await gate();
  await db.adminUser.update({ where: { id }, data: { lockedByOps: locked, ...(locked ? { tokenVersion: { increment: 1 } } : {}) } });
  await opsLog("admin.lock", { id, locked });
  await ownerVisible(locked ? "user.disabled_by_developer" : "user.enabled_by_developer", "AdminUser", id);
  return { ok: true, error: null };
}

export async function resetAdminPasswordOpsAction(id: string, password: string) {
  await gate();
  if (password.length < 10) return { ok: false, error: "Password must be at least 10 characters" };
  await db.adminUser.update({ where: { id }, data: { passwordHash: await hashPassword(password), tokenVersion: { increment: 1 } } });
  await opsLog("admin.password_reset", { id });
  await ownerVisible("user.password_reset_by_developer", "AdminUser", id);
  return { ok: true, error: null };
}

// Open the admin panel as this user. Nothing is written under their name while viewing.
export async function viewAsAction(id: string) {
  await gate();
  const u = await db.adminUser.findUniqueOrThrow({ where: { id } });
  await setAdminSession(u.id, u.email, u.role, u.tokenVersion, true);
  await opsLog("admin.view_as", { id });
  await ownerVisible(`developer.viewed_admin_as_${u.role.toLowerCase()}`, "AdminUser", id);
  redirect("/admin");
}

export async function exitViewAction() {
  await clearAdminSession();
  if (await requireOps().catch(() => null)) redirect(opsBase());
  redirect("/admin/login");
}
