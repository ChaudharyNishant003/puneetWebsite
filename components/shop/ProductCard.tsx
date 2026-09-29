import Link from "next/link";
import { inr, savePercent } from "@/lib/format";
import type { CardProduct } from "@/lib/catalog";
import { IconStar } from "../icons";
import { WishlistButton } from "./WishlistButton";
import { QuickAdd } from "./QuickAdd";

export function ProductCard({ p, className = "", priority = false }: { p: CardProduct; className?: string; priority?: boolean }) {
  const off = savePercent(p.price, p.mrp);
  const sizes = [...new Map(p.variants.map((v) => [v.size, v])).values()];
  const inStockSizes = new Set(p.variants.filter((v) => v.stock > 0).map((v) => v.size));
  const colours = [...new Set(p.variants.map((v) => v.colour))];
  const [img1, img2] = p.images;
  const soldOut = inStockSizes.size === 0;

  return (
    <div className={`group relative ${className}`}>
      <Link href={`/p/${p.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded bg-surface">
          {img1 ? (
            <img src={img1.url} alt={img1.alt} loading={priority ? "eager" : "lazy"} width={600} height={800} className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300" />
          ) : null}
          {img2 ? (
            <img src={img2.url} alt="" aria-hidden loading="lazy" width={600} height={800} className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          ) : null}
          {p.badges[0] ? <span className="absolute left-0 top-2 bg-dark px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-white">{p.badges[0]}</span> : null}
          {p.ratingCount > 0 ? (
            <span className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 rounded-sm bg-white/95 px-1.5 py-0.5 text-[10.5px] font-semibold">
              <IconStar size={10} className="text-save" /> {p.ratingAvg.toFixed(1)}
              <span className="font-normal text-muted">({p.ratingCount})</span>
            </span>
          ) : null}
          {soldOut ? <span className="absolute inset-x-0 bottom-0 bg-white/85 py-1.5 text-center text-xs font-semibold uppercase tracking-wide">Sold out</span> : null}
        </div>
        <h3 className="mt-2 truncate text-[13px] leading-snug">{p.name}</h3>
        <p className="text-[11px] text-muted">{colours.length > 1 ? `${colours.length} colours` : colours[0]}</p>
        <p className="mt-0.5 text-[13.5px] font-semibold">
          {inr(p.price)}
          {off > 0 ? (
            <>
              <s className="ml-1.5 text-[11.5px] font-normal text-muted">{inr(p.mrp)}</s>
              <span className="ml-1.5 text-[11.5px] font-medium text-save">Save {off}%</span>
            </>
          ) : null}
        </p>
      </Link>
      <div className="mt-1.5 flex flex-wrap gap-1" aria-label="Available sizes">
        {sizes.map((v) => (
          <span key={v.size} className={`border px-1.5 py-px text-[10px] ${inStockSizes.has(v.size) ? "border-line-strong" : "border-dashed border-line text-muted line-through"}`}>
            {v.size}
          </span>
        ))}
      </div>
      <div className="absolute right-1.5 top-1.5">
        <WishlistButton productId={p.id} />
      </div>
      {!soldOut ? <QuickAdd product={{ name: p.name, slug: p.slug, price: p.price, variants: p.variants, image: img1?.url }} /> : null}
    </div>
  );
}
