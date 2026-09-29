import "server-only";
import { hash, verify } from "@node-rs/argon2";
import { redirect } from "next/navigation";
import { db } from "../db";
import { getAdminSession } from "./session";

export const hashPassword = (pw: string) => hash(pw);
export const checkPassword = (h: string, pw: string) => verify(h, pw);

// While the developer views the panel as an admin, actions are recorded as "developer" (visible to the
// owner in the activity list), never under the admin's own name.
export const DEVELOPER_ACTOR = "developer";

export async function requireAdmin(role?: "OWNER") {
  const s = await getAdminSession();
  if (!s) redirect("/admin/login");
  const user = await db.adminUser.findUnique({ where: { id: s.sub } });
  // Disabled accounts and password resets end existing sessions immediately.
  // (Viewing-as from the ops console works even for a disabled account.)
  if (!user || (!s.imp && (!user.active || user.lockedByOps)) || (s.tv ?? 0) !== user.tokenVersion) redirect("/admin/login");
  if (role === "OWNER" && user.role !== "OWNER") redirect("/admin?denied=1");
  return s.imp ? { ...user, email: DEVELOPER_ACTOR, viewing: true as const } : { ...user, viewing: false as const };
}

export async function audit(actor: string, action: string, entity: string, entityId?: string, diff?: unknown) {
  await db.auditLog.create({
    data: { actor, action, entity, entityId, diff: diff === undefined ? undefined : JSON.parse(JSON.stringify(diff)) },
  });
}
