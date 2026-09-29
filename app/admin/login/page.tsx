import type { Metadata } from "next";
import { AdminLoginForm } from "./form";

export const metadata: Metadata = { title: "Admin login", robots: { index: false, follow: false } };

export default function AdminLogin() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm border border-line bg-white p-6">
        <p className="text-center text-lg font-bold uppercase tracking-[0.14em] text-brand">Puneet</p>
        <p className="mb-5 text-center text-xs uppercase tracking-widest text-muted">Store admin</p>
        <AdminLoginForm />
      </div>
    </div>
  );
}
