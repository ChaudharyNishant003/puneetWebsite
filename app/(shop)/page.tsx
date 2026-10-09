import Link from "next/link";
import { db } from "@/lib/db";
import { rail } from "@/lib/catalog";
import { getCms } from "@/lib/settings";
import { shop } from "@/lib/config";
import { siteFlags } from "@/lib/flags";
import { ProductCard } from "@/components/shop/ProductCard";
import { Section } from "@/components/shop/Section";
import { IconCash, IconLock, IconPhone, IconPin, IconStar, IconStore, IconSwap, IconTruck } from "@/components/icons";

// Rendered per request: the build machine has no database access.
export const dynamic = "force-dynamic";

type Hero = { title: string; subtitle: string; cta: string; href: string; from: string; to: string; image?: string };
type Rail = { title: string; subtitle?: string; source: string };

const TILE_CATS = ["kurta-sets", "sarees", "kurtis", "men-kurtas", "men-shirts", "girls", "boys", "women-innerwear"];
const OCCASIONS = [
  { slug: "occasion-daily", name: "Daily Wear", from: "#9DB7A3", to: "#3F5E48" },
  { slug: "occasion-office", name: "Office Wear", from: "#9AA7BD", to: "#3A4A66" },
  { slug: "occasion-festive", name: "Festive", from: "#E9B872", to: "#A35F1C" },
  { slug: "occasion-wedding", name: "Wedding Guest", from: "#D98695", to: "#8E1B3A" },
];

export default async function Home() {
  const flags = await siteFlags();
  const on = (k: string) => flags[k] ?? true;
  const [hero, rails, cats, reviews] = await Promise.all([
    getCms<Hero>("hero", { title: "New Season", subtitle: shop.tagline, cta: "Shop Now", href: "/c/new-arrivals", from: "#C9727A", to: "#8E1B3A" }),
    getCms<Rail[]>("rails", [{ title: "Bestsellers", source: "storeBestseller" }]),
    db.category.findMany({
      where: { slug: { in: TILE_CATS } },
      select: { slug: true, name: true, image: true, products: { where: { status: "ACTIVE" }, take: 1, orderBy: { soldCount: "desc" }, select: { images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } } } },
    }),
    db.review.findMany({
      where: { status: "APPROVED", rating: { gte: 4 } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { product: { select: { slug: true, name: true, images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } } } },
    }),
  ]);
  const railData = await Promise.all(rails.map((r) => rail(r.source, 8)));
  const orderedCats = TILE_CATS.map((s) => cats.find((c) => c.slug === s)).filter(Boolean) as typeof cats;

  return (
    <>
      {/* Hero: one campaign, one CTA (no carousel) */}
      <section className="relative">
        <Link href={hero.href} className="relative flex h-[62vw] max-h-[520px] min-h-[240px] flex-col justify-end p-5 text-white md:p-12" style={{ background: hero.image ? undefined : `linear-gradient(160deg, ${hero.from} 0%, ${hero.to} 70%)` }}>
          {hero.image ? <img src={hero.image} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
          <div className="relative max-w-xl">
            <h1 className="text-[28px] font-semibold leading-tight md:text-5xl">{hero.title}</h1>
            <p className="mb-4 mt-2 text-sm opacity-90 md:text-base">{hero.subtitle}</p>
            <span className="inline-block bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-dark">{hero.cta}</span>
          </div>
        </Link>
      </section>

      <Section title="Shop by Category" subtitle="Poore parivaar ke liye, ek hi dukaan mein">
        <div className="grid grid-cols-4 gap-2 md:grid-cols-8 md:gap-4">
          {orderedCats.map((c) => (
            <Link key={c.slug} href={`/c/${c.slug}`} className="text-center text-[11px] font-medium md:text-sm">
              <span className="mb-1.5 block aspect-[3/4] overflow-hidden rounded bg-surface">
                {c.image ?? c.products[0]?.images[0]?.url ? <img src={c.image ?? c.products[0].images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
              </span>
              {c.name}
            </Link>
          ))}
        </div>
      </Section>

      {on("occasionBudget") ? <>
      <Section title="Shop by Occasion" subtitle="Daily se shaadi tak">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
          {OCCASIONS.map((o) => (
            <Link key={o.slug} href={`/c/${o.slug}`} className="flex aspect-[16/10] items-end rounded p-3 text-sm font-semibold uppercase tracking-wider text-white md:text-base" style={{ background: `linear-gradient(160deg, ${o.from}, ${o.to})` }}>
              {o.name}
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Shop by Budget">
        <div className="no-scrollbar flex gap-2 overflow-x-auto md:justify-center">
          {[["under-499", "Under ₹499"], ["under-999", "Under ₹999"], ["under-1499", "Under ₹1,499"], ["under-2499", "Under ₹2,499"]].map(([s, n]) => (
            <Link key={s} href={`/c/${s}`} className="shrink-0 border border-dark px-4 py-2 text-sm font-medium hover:bg-dark hover:text-white">{n}</Link>
          ))}
        </div>
      </Section>
      </> : null}

      {rails.map((r, i) => (
        <Section key={r.title} title={r.title} subtitle={r.subtitle} href={r.source === "new" ? "/c/new-arrivals" : "/c/women"}>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:px-0 lg:grid-cols-4">
            {railData[i].map((p, idx) => (<ProductCard key={p.id} p={p} priority={i === 0 && idx < 2} className="w-[44vw] shrink-0 md:w-auto" />))}
          </div>
        </Section>
      ))}

      {reviews.length && on("reviews") && on("photoReviews") ? (
        <Section title="Customers Love Us" subtitle="Photo reviews · Verified buyers">
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
            {reviews.map((r) => (
              <Link key={r.id} href={`/p/${r.product.slug}#reviews`} className="flex w-72 shrink-0 gap-3 rounded border border-line p-3">
                <img src={r.photos[0] ?? r.product.images[0]?.url} alt="" loading="lazy" width={64} height={85} className="h-[85px] w-16 shrink-0 rounded object-cover" />
                <div className="min-w-0 text-xs">
                  <p className="flex items-center gap-0.5 text-save">{Array.from({ length: r.rating }, (_, k) => <IconStar key={k} size={11} />)}</p>
                  <p className="mt-1 line-clamp-3 leading-relaxed">“{r.body}”</p>
                  <p className="mt-1 font-semibold">{r.authorName}{r.sizeBought ? `, ${r.sizeBought} size` : ""}</p>
                  {r.verified ? <p className="text-[11px] text-save">✓ Verified buyer{r.fit === "TRUE" ? " · True to size" : ""}</p> : null}
                </div>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      <section className="mt-8 grid grid-cols-4 gap-1 border-y border-line bg-surface px-2 py-5 text-center text-[10.5px] leading-tight md:text-sm">
        {on("storePage") ? <div><IconStore className="mx-auto mb-1.5" size={22} />Real Shop<br />Since {shop.since}</div> : <div><IconTruck className="mx-auto mb-1.5" size={22} />Ships in<br />1–2 Days</div>}
        <div><IconSwap className="mx-auto mb-1.5" size={22} />Free Size<br />Exchange</div>
        <div><IconCash className="mx-auto mb-1.5" size={22} />Cash on<br />Delivery</div>
        <div><IconLock className="mx-auto mb-1.5" size={22} />Secure<br />Payments</div>
      </section>

      {on("storePage") ? <section className="mx-4 mt-8 rounded bg-brand-soft p-5 md:mx-auto md:max-w-3xl">
        <h2 className="eyebrow text-base text-brand">Visit Our Store</h2>
        <p className="mt-2 text-sm leading-relaxed">{shop.address} · {shop.hours}<br />Try karein, alteration karwayein, exchange karein.</p>
        <div className="mt-3 flex gap-2">
          <a href={shop.mapsUrl} target="_blank" rel="noopener" className="flex items-center gap-1 border border-brand bg-white px-3 py-2 text-xs font-semibold text-brand"><IconPin size={15} /> Directions</a>
          <a href={`tel:${shop.phone.replace(/\s/g, "")}`} className="flex items-center gap-1 border border-brand bg-white px-3 py-2 text-xs font-semibold text-brand"><IconPhone size={15} /> Call Store</a>
        </div>
      </section> : null}
    </>
  );
}
