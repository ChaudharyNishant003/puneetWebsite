"use client";
import { resetAdminPasswordAction } from "@/app/actions/admin-config";

export function ResetPassword({ id }: { id: string }) {
  return (
    <button
      type="button"
      className="text-xs underline"
      onClick={async () => {
        const pw = prompt("New password (10+ characters):");
        if (!pw) return;
        const r = await resetAdminPasswordAction(id, pw);
        alert(r.ok ? "Password changed" : r.error);
      }}
    >
      Reset password
    </button>
  );
}
