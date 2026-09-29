import "server-only";
import { hash, verify } from "@node-rs/argon2";
import { redirect } from "next/navigation";
import { db } from "../db";
import { getAdminSession } from "./session";

export const hashPassword = (pw: string) => hash(pw);
export const checkPassword = (h: string, pw: string) => verify(h, pw);

export async function requireAdmin(role?: "OWNER") {
  const s = await getAdminSession();
  if (!s) redirect("/admin/login");
  const user = await db.adminUser.findUnique({ where: { id: s.sub } });
  if (!user || !user.active) redirect("/admin/login");
  if (role === "OWNER" && user.role !== "OWNER") redirect("/admin?denied=1");
  return user;
}

export async function audit(actor: string, action: string, entity: string, entityId?: string, diff?: unknown) {
  await db.auditLog.create({
    data: { actor, action, entity, entityId, diff: diff === undefined ? undefined : JSON.parse(JSON.stringify(diff)) },
  });
}
