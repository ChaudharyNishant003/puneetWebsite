"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconBag, IconChevron, IconClose, IconGrid, IconHeart, IconHome, IconMenu, IconSearch, IconStore, IconUser } from "../icons";
import { openCart } from "./cart-events";
import { useSite } from "./SiteFlags";

type MenuCat = { id: string; slug: string; name: string; children: { id: string; slug: string; name: string }[] };

const OCCASIONS = [
  ["occasion-daily", "Daily Wear"],
  ["occasion-office", "Office Wear"],
  ["occasion-festive", "Festive"],
  ["occasion-wedding", "Wedding Guest"],
  ["for-mother", "Maa ke liye"],
] as const;
const BUDGET = [
  ["under-499", "Under ₹499"],
  ["under-999", "Under ₹999"],
  ["under-1499", "Under ₹1,499"],
  ["under-2499", "Under ₹2,499"],
] as const;

export function MenuButton({ menu }: { menu: MenuCat[] }) {
  const occasionBudget = useSite("occasionBudget");
  const storePage = useSite("storePage");
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(menu[0]?.id ?? null);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Open menu" className="p-1.5"><IconMenu /></button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="Menu">
          <nav className="flex h-full w-[86%] max-w-sm flex-col overflow-y-auto bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="eyebrow text-sm">Menu</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-1"><IconClose /></button>
            </div>
            <Link href="/c/new-arrivals" className="border-b border-line px-4 py-3 text-sm font-medium uppercase tracking-wide">New Arrivals</Link>
            {menu.map((m) => (
              <div key={m.id} className="border-b border-line">
                <button onClick={() => setExpanded(expanded === m.id ? null : m.id)} aria-expanded={expanded === m.id} className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium uppercase tracking-wide">
                  {m.name}
                  <IconChevron size={16} className={`transition-transform ${expanded === m.id ? "rotate-90" : ""}`} />
                </button>
                {expanded === m.id ? (
                  <div className="bg-surface pb-2">
                    <Link href={`/c/${m.slug}`} className="block px-6 py-2 text-sm font-medium">All {m.name}</Link>
                    {m.children.map((c) => (<Link key={c.id} href={`/c/${c.slug}`} className="block px-6 py-2 text-sm">{c.name}</Link>))}
                  </div>
                ) : null}
              </div>
            ))}
            {occasionBudget ? <><div className="border-b border-line px-4 py-3">
              <p className="eyebrow mb-2 text-xs text-muted">Shop by Occasion</p>
              <div className="flex flex-wrap gap-2">{OCCASIONS.map(([s, n]) => (<Link key={s} href={`/c/${s}`} className="border border-line-strong px-3 py-1.5 text-xs">{n}</Link>))}</div>
            </div>
            <div className="border-b border-line px-4 py-3">
              <p className="eyebrow mb-2 text-xs text-muted">Shop by Budget</p>
              <div className="flex flex-wrap gap-2">{BUDGET.map(([s, n]) => (<Link key={s} href={`/c/${s}`} className="border border-line-strong px-3 py-1.5 text-xs">{n}</Link>))}</div>
            </div></> : null}
            <Link href="/c/plus-size" className="border-b border-line px-4 py-3 text-sm font-medium uppercase tracking-wide">Plus Size</Link>
            <Link href="/c/sale" className="border-b border-line px-4 py-3 text-sm font-medium uppercase tracking-wide text-brand">Sale</Link>
            {storePage ? <Link href="/store" className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm"><IconStore size={18} /> Visit our store</Link> : null}
            <Link href="/account" className="flex items-center gap-2 px-4 py-3 text-sm"><IconUser size={18} /> My account & orders</Link>
          </nav>
        </div>
      ) : null}
    </>
  );
}

const POPULAR = ["kurta set", "office kurti", "shaadi suit", "saree", "men kurta", "kids lehenga", "under 999"];
const RECENT_KEY = "pg_recent_searches";

export function SearchButton() {
  const suggestOn = useSite("searchSuggest");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [sugs, setSugs] = useState<{ slug: string; name: string; price: number; image: string | null }[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    try {
      setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"));
    } catch {}
    setTimeout(() => input.current?.focus(), 30);
  }, [open]);

  useEffect(() => {
    if (!suggestOn || q.trim().length < 2) {
      setSugs([]);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`, { signal: ctl.signal })
        .then((r) => r.json())
        .then((j) => setSugs(j.items ?? []))
        .catch(() => {});
    }, 180);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q, suggestOn]);

  const go = (term: string) => {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...recent.filter((r) => r !== t)].slice(0, 6);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {}
    router.push(`/search?q=${encodeURIComponent(t)}`);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Search" className="p-1.5"><IconSearch /></button>
      {open ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white" role="dialog" aria-modal="true" aria-label="Search">
          <form onSubmit={(e) => { e.preventDefault(); go(q); }} className="flex items-center gap-2 border-b border-line px-3 py-2">
            <IconSearch className="text-muted" />
            <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} type="search" enterKeyHint="search" placeholder='Try "office kurti under 1000"' aria-label="Search products" className="flex-1 py-2 text-base outline-none" />
            <button type="button" onClick={() => setOpen(false)} aria-label="Close search" className="p-1"><IconClose /></button>
          </form>
          <div className="mx-auto max-w-2xl px-4 py-4">
            {sugs.length ? (
              <ul className="mb-5 divide-y divide-line">
                {sugs.map((s) => (
                  <li key={s.slug}>
                    <Link href={`/p/${s.slug}`} className="flex items-center gap-3 py-2">
                      {s.image ? <img src={s.image} alt="" width={40} height={53} className="h-13 w-10 rounded object-cover" /> : null}
                      <span className="flex-1 text-sm">{s.name}</span>
                      <span className="text-sm font-semibold">₹{s.price.toLocaleString("en-IN")}</span>
                    </Link>
                  </li>
                ))}
                <li><button onClick={() => go(q)} className="py-3 text-sm font-medium text-brand">See all results for “{q}”</button></li>
              </ul>
            ) : null}
            {recent.length ? (
              <>
                <p className="eyebrow mb-2 text-xs text-muted">Recent searches</p>
                <div className="mb-5 flex flex-wrap gap-2">{recent.map((r) => (<button key={r} onClick={() => go(r)} className="border border-line-strong px-3 py-1.5 text-sm">{r}</button>))}</div>
              </>
            ) : null}
            <p className="eyebrow mb-2 text-xs text-muted">Popular</p>
            <div className="flex flex-wrap gap-2">{POPULAR.map((r) => (<button key={r} onClick={() => go(r)} className="border border-line-strong px-3 py-1.5 text-sm">{r}</button>))}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function CartButton({ count }: { count: number }) {
  return (
    <button onClick={openCart} aria-label={`Bag, ${count} items`} className="relative p-1.5">
      <IconBag />
      {count > 0 ? <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{count}</span> : null}
    </button>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const wishlist = useSite("wishlist");
  const storePage = useSite("storePage");
  if (pathname.startsWith("/checkout") || pathname.startsWith("/p/")) return null;
  const item = (href: string, label: string, Icon: typeof IconHome, active: boolean) => (
    <Link href={href} className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[10.5px] ${active ? "font-semibold text-brand" : "text-muted"}`} aria-current={active ? "page" : undefined}>
      <Icon size={20} />
      {label}
    </Link>
  );
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-white pb-[env(safe-area-inset-bottom)] pt-1.5 md:hidden" aria-label="Quick navigation">
      {item("/", "Home", IconHome, pathname === "/")}
      {item("/categories", "Shop", IconGrid, pathname.startsWith("/categories") || pathname.startsWith("/c/"))}
      {wishlist ? item("/wishlist", "Wishlist", IconHeart, pathname === "/wishlist") : null}
      {storePage ? item("/store", "Store", IconStore, pathname === "/store") : null}
      {item("/account", "Account", IconUser, pathname.startsWith("/account"))}
    </nav>
  );
}
