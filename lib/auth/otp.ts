import "server-only";
import crypto from "node:crypto";
import { db } from "../db";
import { rateLimit } from "../rate-limit";
import { sendOtpSms, smsIsMock } from "../integrations/sms";
import { isDemoMode } from "../config";

const OTP_TTL_MIN = 5;
const MAX_ATTEMPTS = 5;

export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

const hash = (phone: string, code: string) =>
  crypto.createHmac("sha256", process.env.SESSION_SECRET ?? "dev").update(`${phone}:${code}`).digest("hex");

export async function requestOtp(phone: string, purpose: "LOGIN" | "COD", ip = "unknown") {
  if (!(await rateLimit(`otp:phone:${phone}`, 5, 15 * 60))) return { ok: false as const, error: "Too many OTP requests. Try again in 15 minutes." };
  if (!(await rateLimit(`otp:ip:${ip}`, 20, 15 * 60))) return { ok: false as const, error: "Too many requests from this network." };

  const code = crypto.randomInt(100000, 1000000).toString();
  await db.otpCode.updateMany({ where: { phone, purpose, consumed: false }, data: { consumed: true } });
  await db.otpCode.create({
    data: { phone, purpose, codeHash: hash(phone, code), expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60_000) },
  });
  await sendOtpSms(phone, code);
  // With no SMS provider (local dev or a demo deploy) we surface the code so the flow is testable.
  const devCode = smsIsMock() && isDemoMode() ? code : undefined;
  return { ok: true as const, devCode };
}

export async function verifyOtp(phone: string, purpose: "LOGIN" | "COD", code: string) {
  const otp = await db.otpCode.findFirst({
    where: { phone, purpose, consumed: false },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.expiresAt < new Date()) return { ok: false as const, error: "OTP expired. Please request a new one." };
  if (otp.attempts >= MAX_ATTEMPTS) return { ok: false as const, error: "Too many wrong attempts. Request a new OTP." };
  const a = Buffer.from(otp.codeHash);
  const b = Buffer.from(hash(phone, code.trim()));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return { ok: false as const, error: "Incorrect OTP" };
  }
  await db.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });
  return { ok: true as const };
}
