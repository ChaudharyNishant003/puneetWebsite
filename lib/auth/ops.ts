import "server-only";
import crypto from "node:crypto";
import { notFound } from "next/navigation";
import { db } from "../db";
import { getOpsSession } from "./session";
import { checkPassword, hashPassword } from "./admin";
import { sendEmail } from "../integrations/email";

export const opsBase = () => `/${(process.env.OPS_CONSOLE_PATH ?? "").replace(/^\/+|\/+$/g, "")}`;
// HARD RULE: the console exists for the testing phase only. It works only in local dev or on a
// DEMO_MODE=1 deployment, so a live production store can never expose it (and it must be removed
// before go-live — see README "Before launch").
export const opsEnabled = () =>
  Boolean(process.env.OPS_CONSOLE_PATH && process.env.OPS_EMAIL && process.env.OPS_PASSWORD) &&
  (process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "1");

// Anything wrong (console disabled, not signed in) looks like a missing page.
export async function requireOps() {
  if (!opsEnabled()) notFound();
  const s = await getOpsSession();
  if (!s) return null;
  const u = await db.opsUser.findUnique({ where: { id: s.sub } });
  return u;
}

// First sign-in creates the account from the server environment (never from seed data).
export async function findOrBootstrap(email: string) {
  const existing = await db.opsUser.findUnique({ where: { email } });
  if (existing) return existing;
  const count = await db.opsUser.count();
  if (count === 0 && email === process.env.OPS_EMAIL?.toLowerCase()) {
    return db.opsUser.create({ data: { email, passwordHash: await hashPassword(process.env.OPS_PASSWORD!) } });
  }
  return null;
}

export { checkPassword };

const otpHash = (email: string, code: string) => crypto.createHmac("sha256", process.env.SESSION_SECRET ?? "dev").update(`ops:${email}:${code}`).digest("hex");

export async function issueOtp(email: string) {
  const code = crypto.randomInt(100000, 1000000).toString();
  await db.opsOtp.updateMany({ where: { email, consumed: false }, data: { consumed: true } });
  await db.opsOtp.create({ data: { email, codeHash: otpHash(email, code), expiresAt: new Date(Date.now() + 10 * 60_000) } });
  const mailConfigured = Boolean(process.env.RESEND_API_KEY);
  await sendEmail(email, "Your sign-in code", `<p>Your code is <b style="font-size:20px;letter-spacing:4px">${code}</b>. It expires in 10 minutes.</p>`).catch(() => {});
  // Until an email service is connected the code is shown on screen (agreed with the site owner).
  return mailConfigured ? {} : { shownCode: code };
}

export async function checkOtp(email: string, code: string) {
  const o = await db.opsOtp.findFirst({ where: { email, consumed: false }, orderBy: { createdAt: "desc" } });
  if (!o || o.expiresAt < new Date() || o.attempts >= 5) return false;
  const a = Buffer.from(o.codeHash);
  const b = Buffer.from(otpHash(email, code.trim()));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    await db.opsOtp.update({ where: { id: o.id }, data: { attempts: { increment: 1 } } });
    return false;
  }
  await db.opsOtp.update({ where: { id: o.id }, data: { consumed: true } });
  return true;
}

export async function opsLog(action: string, detail?: unknown) {
  await db.opsLog.create({ data: { action, detail: detail === undefined ? undefined : JSON.parse(JSON.stringify(detail)) } });
}

// Everything the developer changes is also shown to the owner, in plain words, in their activity list.
export async function ownerVisible(action: string, entity: string, entityId?: string) {
  await db.auditLog.create({ data: { actor: "developer", action, entity, entityId } });
}
