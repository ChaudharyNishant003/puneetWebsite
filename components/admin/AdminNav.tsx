"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavLink = { href: string; label: string; ownerOnly?: boolean };

export function AdminNav({ links }: { links: NavLink[] }) {
  const path = usePathname();
  return (
    <nav className="no-scrollbar flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible md:pb-0" aria-label="Admin">
      {links.map(({ href, label }) => {
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
