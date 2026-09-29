"use client";
import { useActionState, useRef, useEffect } from "react";

type R = { ok: boolean; error: string | null } | null;

// Server-rendered fields + a server action; shows the result and optionally resets on success.
export function ActionForm({ action, children, submit = "Save", className = "", reset = false }: { action: (s: R, f: FormData) => Promise<R>; children: React.ReactNode; submit?: string; className?: string; reset?: boolean }) {
  const [state, run, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && reset) ref.current?.reset();
  }, [state, reset]);
  return (
    <form ref={ref} action={run} className={className}>
      {children}
      <div className="mt-3 flex items-center gap-3">
        <button disabled={pending} className="btn btn-primary py-2">{pending ? "Saving…" : submit}</button>
        {state?.error ? <p className="text-sm text-danger" role="alert">{state.error}</p> : state?.ok ? <p className="text-sm text-save">Saved ✓</p> : null}
      </div>
    </form>
  );
}

export function ActionButton({ action, children, confirmText, className = "text-xs underline" }: { action: () => Promise<{ ok: boolean; error?: string | null }>; children: React.ReactNode; confirmText?: string; className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        if (confirmText && !confirm(confirmText)) return;
        const r = await action();
        if (!r.ok && r.error) alert(r.error);
        else location.reload();
      }}
    >
      {children}
    </button>
  );
}
