"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: [string, string, boolean?][] = [
  ["/admin", "Dashboard"],
  ["/admin/orders", "Orders"],
  ["/admin/products", "Products"],
  ["/admin/exchanges", "Exchanges"],
  ["/admin/reviews", "Reviews"],
  ["/admin/coupons", "Coupons"],
  ["/admin/pincodes", "Pincodes"],
  ["/admin/content", "Homepage & Search"],
  ["/admin/settings", "Settings", true],
  ["/admin/reports", "Reports", true],
  ["/admin/users", "Users", true],
];

export function AdminNav({ owner }: { owner: boolean }) {
  const path = usePathname();
  return (
    <nav className="no-scrollbar flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible md:pb-0" aria-label="Admin">
      {LINKS.filter(([, , ownerOnly]) => owner || !ownerOnly).map(([href, label]) => {
        const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
        return (
          <Link key={href} href={href} className={`shrink-0 rounded px-3 py-2 text-sm ${active ? "bg-brand-soft font-semibold text-brand" : "hover:bg-surface"}`} aria-current={active ? "page" : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
