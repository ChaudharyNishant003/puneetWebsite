"use client";
import { useActionState, useState } from "react";
import { opsOtpAction, opsPasswordAction } from "@/app/actions/ops";

const input = "w-full rounded border border-[#2d3b4a] bg-[#0b1118] px-3 py-2.5 text-sm outline-none focus:border-[#4f8cc9]";
const btn = "w-full rounded bg-[#2f6fb0] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50";

export function OpsLogin() {
  const [email, setEmail] = useState("");
  const [pw, pwAction, pwPending] = useActionState(opsPasswordAction, null);
  const [otp, otpAction, otpPending] = useActionState(opsOtpAction, null);
  const onOtp = pw?.step === "otp" || otp?.step === "otp";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-[#2d3b4a] bg-[#131c26] p-6">
        <p className="mb-5 text-center text-sm font-semibold tracking-widest text-[#8b98a5]">SIGN IN</p>
        {!onOtp ? (
          <form action={pwAction} className="space-y-3">
            <input name="email" type="email" required autoComplete="username" placeholder="Email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
            <input name="password" type="password" required autoComplete="current-password" placeholder="Password" aria-label="Password" className={input} />
            {pw?.error ? <p className="text-sm text-[#f08b83]" role="alert">{pw.error}</p> : null}
            <button disabled={pwPending} className={btn}>{pwPending ? "…" : "Continue"}</button>
          </form>
        ) : (
          <form action={otpAction} className="space-y-3">
            <input type="hidden" name="email" value={email} />
            <p className="text-xs text-[#8b98a5]">Enter the 6-digit code sent to {email}.</p>
            {pw?.shownCode ? <p className="rounded bg-[#2b2416] px-2 py-1.5 text-xs text-[#e8b75a]">Email service not connected — code: <b>{pw.shownCode}</b></p> : null}
            <input name="code" inputMode="numeric" autoComplete="one-time-code" required maxLength={6} placeholder="6-digit code" aria-label="Code" className={`${input} tracking-[0.3em]`} autoFocus />
            {otp?.error ? <p className="text-sm text-[#f08b83]" role="alert">{otp.error}</p> : null}
            <button disabled={otpPending} className={btn}>{otpPending ? "…" : "Verify"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
