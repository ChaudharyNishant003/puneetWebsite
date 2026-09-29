"use client";
import { useActionState } from "react";
import { adminLoginAction } from "@/app/actions/admin-auth";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLoginAction, null);
  return (
    <form action={action} className="space-y-3">
      <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="username" required className="input" /></div>
      <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required className="input" /></div>
      {state?.error ? <p className="text-sm text-danger" role="alert">{state.error}</p> : null}
      <button disabled={pending} className="btn btn-primary w-full">{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
