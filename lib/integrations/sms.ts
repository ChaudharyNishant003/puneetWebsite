import "server-only";

// MSG91 when keys are present, otherwise a mock that logs to the server console
// (and the OTP route shows the code on-screen in non-production so flows can be tested).

export const smsIsMock = () => !process.env.MSG91_AUTH_KEY;

export async function sendOtpSms(phone: string, code: string) {
  if (smsIsMock()) {
    console.log(`[sms:mock] OTP for ${phone}: ${code}`);
    return { ok: true, mock: true };
  }
  const res = await fetch("https://control.msg91.com/api/v5/otp", {
    method: "POST",
    headers: { "Content-Type": "application/json", authkey: process.env.MSG91_AUTH_KEY! },
    body: JSON.stringify({ template_id: process.env.MSG91_OTP_TEMPLATE_ID, mobile: `91${phone}`, otp: code }),
  });
  return { ok: res.ok, mock: false };
}

export type SmsTemplate = "ORDER_PLACED" | "ORDER_SHIPPED" | "ORDER_DELIVERED" | "REVIEW_REQUEST" | "EXCHANGE_UPDATE";

export async function sendSms(phone: string, template: SmsTemplate, vars: Record<string, string>) {
  if (smsIsMock()) {
    console.log(`[sms:mock] ${template} -> ${phone}`, vars);
    return { ok: true, mock: true };
  }
  const flowId = process.env[`MSG91_FLOW_${template}`];
  if (!flowId) return { ok: false, mock: false };
  const res = await fetch("https://control.msg91.com/api/v5/flow", {
    method: "POST",
    headers: { "Content-Type": "application/json", authkey: process.env.MSG91_AUTH_KEY! },
    body: JSON.stringify({ template_id: flowId, recipients: [{ mobiles: `91${phone}`, ...vars }] }),
  });
  return { ok: res.ok, mock: false };
}
