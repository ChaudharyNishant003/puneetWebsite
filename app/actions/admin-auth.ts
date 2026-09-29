"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { checkPassword } from "@/lib/auth/admin";
import { clearAdminSession, setAdminSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";

export async function adminLoginAction(_: unknown, form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!(await rateLimit(`admin-login:${ip}`, 10, 15 * 60)) || !(await rateLimit(`admin-login:${email}`, 5, 15 * 60)))
    return { error: "Too many attempts. Try again in 15 minutes." };
  const user = await db.adminUser.findUnique({ where: { email } });
  // Same message for unknown email and wrong password.
  if (!user || !user.active || !(await checkPassword(user.passwordHash, password))) return { error: "Wrong email or password" };
  await db.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await setAdminSession(user.id, user.email, user.role);
  redirect("/admin");
}

export async function adminLogoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}
