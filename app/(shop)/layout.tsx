import Link from "next/link";
import { getMenu } from "@/lib/catalog";
import { cartCount } from "@/lib/cart";
import { getCms } from "@/lib/settings";
import { shop } from "@/lib/config";
import { BottomNav, CartButton, MenuButton, SearchButton } from "@/components/shop/HeaderClient";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { IconHeart, IconUser } from "@/components/icons";
import { Footer } from "@/components/shop/Footer";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [menu, count, ann] = await Promise.all([
    getMenu(),
    cartCount(),
    getCms<{ text: string; link?: string }>("announcement", { text: `Visit our store in ${shop.address}` }),
  ]);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-2">Skip to content</a>
      <div className="bg-dark px-3 py-2 text-center text-[11px] tracking-wide text-white">
        {ann.link ? <Link href={ann.link} className="underline-offset-2 hover:underline">{ann.text}</Link> : ann.text}
      </div>
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
            <Link href="/account" aria-label="Account" className="hidden p-1.5 md:block"><IconUser /></Link>
            <Link href="/wishlist" aria-label="Wishlist" className="p-1.5"><IconHeart /></Link>
            <CartButton count={count} />
          </div>
        </div>
        <nav className="no-scrollbar mx-auto flex max-w-7xl gap-5 overflow-x-auto whitespace-nowrap border-t border-line px-4 py-2.5 text-[12px] font-medium uppercase tracking-wide md:justify-center" aria-label="Categories">
          <Link href="/c/new-arrivals">New Arrivals</Link>
          {menu.map((m) => (<Link key={m.id} href={`/c/${m.slug}`}>{m.name}</Link>))}
          <Link href="/c/occasion-festive">Festive</Link>
          <Link href="/c/plus-size">Plus Size</Link>
          <Link href="/c/sale" className="text-brand">Sale</Link>
        </nav>
      </header>
      <main id="main" className="min-h-[60vh] pb-20 md:pb-0">{children}</main>
      <Footer />
      <BottomNav />
      <CartDrawer />
    </>
  );
}
