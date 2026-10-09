import Link from "next/link";
import { shop } from "@/lib/config";

export function Footer({ showStore = true }: { showStore?: boolean }) {
  return (
    <footer className="mt-10 bg-dark pb-24 text-[13px] text-neutral-300 md:pb-8">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="eyebrow mb-3 text-white">{shop.name}</p>
          <p className="leading-relaxed">{shop.tagline}. Since {shop.since}.</p>
          <p className="mt-3 leading-relaxed">{showStore && shop.address ? <>{shop.address}<br />{shop.hours}</> : <>Customer care: {shop.hours}</>}</p>
        </div>
        <div>
          <p className="eyebrow mb-3 text-white">Shop</p>
          <ul className="space-y-2">
            <li><Link href="/c/women">Women</Link></li>
            <li><Link href="/c/men">Men</Link></li>
            <li><Link href="/c/kids">Kids</Link></li>
            <li><Link href="/c/innerwear">Innerwear</Link></li>
            <li><Link href="/c/sale">Sale</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3 text-white">Help</p>
          <ul className="space-y-2">
            <li><Link href="/account/orders">Track your order</Link></li>
            <li><Link href="/pages/size-guide">Size guide</Link></li>
            <li><Link href="/pages/exchange-policy">Exchange policy</Link></li>
            <li><Link href="/pages/shipping-policy">Shipping & delivery</Link></li>
            {showStore ? <li><Link href="/store">Visit our store</Link></li> : null}
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3 text-white">Contact</p>
          <ul className="space-y-2">
            <li><a href={`tel:${shop.phone.replace(/\s/g, "")}`}>{shop.phone}</a></li>
            <li><a href={`mailto:${shop.email}`}>{shop.email}</a></li>
            <li><Link href="/pages/about">About us</Link></li>
            <li><Link href="/pages/privacy-policy">Privacy policy</Link></li>
            <li><Link href="/pages/terms">Terms of use</Link></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-white/10 px-5 pt-5 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} {shop.name}{shop.gstin ? ` · GSTIN ${shop.gstin} · Prices include GST` : ""}
      </p>
    </footer>
  );
}
