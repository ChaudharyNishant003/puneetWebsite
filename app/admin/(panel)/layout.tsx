import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { adminLogoutAction } from "@/app/actions/admin-auth";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="min-h-screen bg-surface md:flex">
      <aside className="border-b border-line bg-white md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-3 md:block">
          <Link href="/admin" className="block text-base font-bold uppercase tracking-[0.14em] text-brand">Puneet <span className="text-[10px] font-medium tracking-widest text-muted">admin</span></Link>
          <p className="text-[11px] text-muted md:mt-1">{user.name} · {user.role === "OWNER" ? "Owner" : "Staff"}</p>
        </div>
        <AdminNav owner={user.role === "OWNER"} />
        <div className="hidden px-4 py-3 md:block">
          <Link href="/" target="_blank" className="block text-xs text-muted underline">View store ↗</Link>
          <form action={adminLogoutAction}><button className="mt-2 text-xs text-muted underline">Log out</button></form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
