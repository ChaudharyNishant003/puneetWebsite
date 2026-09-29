"use client";
import { useActionState } from "react";
import { updateProfileAction } from "@/app/actions/account";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState(updateProfileAction, null);
  return (
    <form action={action} className="space-y-3">
      <div><label className="label" htmlFor="pf-name">Name</label><input id="pf-name" name="name" defaultValue={name} className="input" autoComplete="name" required minLength={2} /></div>
      <div><label className="label" htmlFor="pf-email">Email (for invoices, optional)</label><input id="pf-email" name="email" type="email" defaultValue={email} className="input" autoComplete="email" /></div>
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : state?.ok ? <p className="text-sm text-save">Saved</p> : null}
      <button disabled={pending} className="btn btn-dark">Save</button>
    </form>
  );
}
