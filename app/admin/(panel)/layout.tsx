import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { getControls, getFlags } from "@/lib/flags";
import { CONTENT_PARTS } from "@/lib/features";
import { exitViewAction } from "@/app/actions/ops";
import { shop } from "@/lib/config";
import { adminLogoutAction } from "@/app/actions/admin-auth";
import { AdminNav, type NavLink } from "@/components/admin/AdminNav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const LINKS: (NavLink & { feature?: string })[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders", feature: "orders" },
  { href: "/admin/products", label: "Products", feature: "products" },
  { href: "/admin/exchanges", label: "Exchanges", feature: "exchanges" },
  { href: "/admin/reviews", label: "Reviews", feature: "reviews" },
  { href: "/admin/coupons", label: "Coupons", feature: "coupons" },
  { href: "/admin/pincodes", label: "Pincodes", feature: "pincodes" },
  { href: "/admin/content", label: "Homepage & Search", feature: "content" },
  { href: "/admin/settings", label: "Settings", feature: "settings", ownerOnly: true },
  { href: "/admin/reports", label: "Reports", feature: "reports", ownerOnly: true },
  { href: "/admin/users", label: "Users", feature: "users", ownerOnly: true },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const [flags, controls] = await Promise.all([getFlags(), getControls()]);

  if (controls.maintenance.admin && !user.viewing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4 text-center">
        <div>
          <p className="text-lg font-semibold">Admin is under maintenance</p>
          <p className="mt-1 text-sm text-muted">{controls.maintenance.message}</p>
          <form action={adminLogoutAction} className="mt-4"><button className="text-xs underline">Log out</button></form>
        </div>
      </div>
    );
  }

  const on = (f?: string) => !f || (f === "content" ? CONTENT_PARTS.some((k) => flags.admin(k)) : flags.admin(f));
  const links = LINKS.filter((l) => on(l.feature) && (user.role === "OWNER" || !l.ownerOnly)).map(({ href, label }) => ({ href, label }));

  return (
    <div className="min-h-screen bg-surface md:flex">
      {user.viewing ? (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 bg-[#1f3b5c] py-1 text-xs text-white">
          Viewing as {user.name} <form action={exitViewAction}><button className="underline">Exit</button></form>
        </div>
      ) : null}
      <aside className={`border-b border-line bg-white md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:border-b-0 md:border-r ${user.viewing ? "mt-6 md:mt-0 md:pt-6" : ""}`}>
        <div className="flex items-center justify-between px-4 py-3 md:block">
          <Link href="/admin" className="block text-base font-bold uppercase tracking-[0.14em] text-brand">{shop.shortName} <span className="text-[10px] font-medium tracking-widest text-muted">admin</span></Link>
          <p className="text-[11px] text-muted md:mt-1">{user.name} · {user.role === "OWNER" ? "Owner" : "Staff"}</p>
        </div>
        <AdminNav links={links} />
        <div className="hidden px-4 py-3 md:block">
          <Link href="/" target="_blank" className="block text-xs text-muted underline">View store ↗</Link>
          <form action={adminLogoutAction}><button className="mt-2 text-xs text-muted underline">Log out</button></form>
        </div>
      </aside>
      <main className={`min-w-0 flex-1 p-4 md:p-6 ${user.viewing ? "md:pt-10" : ""}`}>{children}</main>
    </div>
  );
}
