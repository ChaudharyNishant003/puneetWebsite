import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { shop } from "../config";

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    const dir = path.join(process.cwd(), "tmp", "mails");
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${Date.now()}-${subject.replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}.html`);
    await writeFile(file, `<!-- to: ${to} -->\n${html}`);
    console.log(`[email:mock] ${subject} -> ${to} (${file})`);
    return { ok: true, mock: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? `${shop.name} <orders@resend.dev>`, to, subject, html }),
  });
  return { ok: res.ok, mock: false };
}
