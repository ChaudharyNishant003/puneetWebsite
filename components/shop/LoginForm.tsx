"use client";
import { useState, useTransition } from "react";
import { requestLoginOtpAction, verifyLoginOtpAction } from "@/app/actions/account";
import { readLocalWishlist } from "./WishlistButton";

export function LoginForm({ onDone, compact = false }: { onDone: () => void; compact?: boolean }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const send = () =>
    start(async () => {
      setError(null);
      const r = await requestLoginOtpAction(phone);
      if (!r.ok) return setError(r.error);
      setSent(true);
      setDevCode(r.devCode);
    });

  const verify = () =>
    start(async () => {
      setError(null);
      const r = await verifyLoginOtpAction(phone, otp, readLocalWishlist());
      if (!r.ok) return setError(r.error);
      try {
        localStorage.setItem("pg_wishlist", JSON.stringify(r.wishlist));
        window.dispatchEvent(new Event("pg:wishlist"));
      } catch {}
      onDone();
    });

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (sent) verify(); else send(); }} className="space-y-3">
      {!compact ? <p className="text-sm text-muted">Enter your mobile number. We&apos;ll send a one-time password (OTP). No password needed.</p> : null}
      <div>
        <label htmlFor="login-phone" className="label">Mobile number</label>
        <div className="flex items-center border border-line-strong">
          <span className="px-3 text-sm text-muted">+91</span>
          <input id="login-phone" value={phone} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setSent(false); }} inputMode="numeric" autoComplete="tel-national" placeholder="10-digit mobile number" className="flex-1 py-2.5 pr-3 text-base outline-none" required />
        </div>
      </div>
      {sent ? (
        <div>
          <label htmlFor="login-otp" className="label">OTP sent to +91 {phone}</label>
          <input id="login-otp" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit OTP" className="input text-base tracking-[0.3em]" autoFocus required />
          {devCode ? <p className="mt-1.5 rounded bg-gold-soft px-2 py-1 text-xs">Test mode (SMS not connected): your OTP is <b>{devCode}</b></p> : null}
          <button type="button" onClick={send} disabled={pending} className="mt-1.5 text-xs text-brand underline">Resend OTP</button>
        </div>
      ) : null}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      <button disabled={pending || phone.length !== 10 || (sent && otp.length !== 6)} className="btn btn-primary w-full">
        {pending ? "Please wait…" : sent ? "Verify & continue" : "Send OTP"}
      </button>
    </form>
  );
}
