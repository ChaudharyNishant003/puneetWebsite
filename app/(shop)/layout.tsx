import Link from "next/link";
import { getMenu } from "@/lib/catalog";
import { cartCount } from "@/lib/cart";
import { getCms } from "@/lib/settings";
import { shop } from "@/lib/config";
import { getControls, siteFlags } from "@/lib/flags";
import { BottomNav, CartButton, MenuButton, SearchButton } from "@/components/shop/HeaderClient";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { IconHeart, IconUser } from "@/components/icons";
import { Footer } from "@/components/shop/Footer";
import { SiteFlagsProvider } from "@/components/shop/SiteFlags";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [menu, count, ann, flags, controls] = await Promise.all([
    getMenu(),
    cartCount(),
    getCms<{ text: string; link?: string }>("announcement", { text: `Visit our store in ${shop.address}` }),
    siteFlags(),
    getControls(),
  ]);
  const on = (k: string) => flags[k] ?? true;

  if (controls.maintenance.site) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <p className="text-2xl font-bold uppercase tracking-[0.14em] text-brand">{shop.shortName}</p>
          <p className="mt-6 text-lg font-semibold">We&apos;ll be back soon</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">{controls.maintenance.message}</p>
          <p className="mt-6 text-xs text-muted">{shop.address} · {shop.phone}</p>
        </div>
      </main>
    );
  }

  return (
    <SiteFlagsProvider flags={flags}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-2">Skip to content</a>
      {process.env.DEMO_MODE === "1" ? (
        <div className="bg-gold px-3 py-1.5 text-center text-[11px] font-semibold text-dark">Demo store: products, prices and orders are samples, not real.</div>
      ) : null}
      {on("announcement") ? (
        <div className="bg-dark px-3 py-2 text-center text-[11px] tracking-wide text-white">
          {ann.link ? <Link href={ann.link} className="underline-offset-2 hover:underline">{ann.text}</Link> : ann.text}
        </div>
      ) : null}
      <header className="sticky top-0 z-40 border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5">
          <div className="flex w-24 items-center gap-1">
            <MenuButton menu={menu} />
            <SearchButton />
          </div>
          <Link href="/" className="text-center leading-none" aria-label={`${shop.name} home`}>
            <span className="block text-[19px] font-bold uppercase tracking-[0.14em] text-brand">{shop.shortName}</span>
            <span className="mt-0.5 block text-[8px] font-medium uppercase tracking-[0.3em] text-muted">Garments</span>
          </Link>
          <div className="flex w-24 items-center justify-end gap-1">
            <Link href="/account" aria-label="Account" className={`p-1.5 ${on("wishlist") ? "hidden md:block" : ""}`}><IconUser /></Link>
            {on("wishlist") ? <Link href="/wishlist" aria-label="Wishlist" className="p-1.5"><IconHeart /></Link> : null}
            <CartButton count={count} />
          </div>
        </div>
        <nav className="no-scrollbar mx-auto flex max-w-7xl gap-5 overflow-x-auto whitespace-nowrap border-t border-line px-4 py-2.5 text-[12px] font-medium uppercase tracking-wide md:justify-center" aria-label="Categories">
          <Link href="/c/new-arrivals">New Arrivals</Link>
          {menu.map((m) => (<Link key={m.id} href={`/c/${m.slug}`}>{m.name}</Link>))}
          {on("occasionBudget") ? <Link href="/c/occasion-festive">Festive</Link> : null}
          <Link href="/c/plus-size">Plus Size</Link>
          <Link href="/c/sale" className="text-brand">Sale</Link>
        </nav>
      </header>
      <main id="main" className="min-h-[60vh] pb-20 md:pb-0">{children}</main>
      <Footer showStore={on("storePage")} />
      <BottomNav />
      <CartDrawer />
    </SiteFlagsProvider>
  );
}
