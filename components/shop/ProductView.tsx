"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCartAction } from "@/app/actions/cart";
import { inr, savePercent } from "@/lib/format";
import { IconCash, IconClose, IconPlay, IconRuler, IconShare, IconStar, IconStore, IconSwap, IconTruck } from "../icons";
import { openCart } from "./cart-events";
import { WishlistButton } from "./WishlistButton";
import { useSite } from "./SiteFlags";
import { shop } from "@/lib/config";

type Img = { id: string; url: string; alt: string; colour: string | null };
type V = { id: string; size: string; colour: string; colourHex: string; stock: number };
type Chart = { name: string; unit: string; columns: string[]; rows: { size: string; values: string[] }[]; howToMeasure: string | null; fitRule: string | null } | null;

export type ProductViewProps = {
  id: string;
  slug: string;
  name: string;
  price: number;
  mrp: number;
  sku: string;
  modelInfo: string | null;
  videoUrl: string | null;
  isExchangeable: boolean;
  ratingAvg: number;
  ratingCount: number;
  fitSummary: string | null;
  images: Img[];
  variants: V[];
  chart: Chart;
  settings: { freeShippingThreshold: number; courierShippingFee: number; prepaidDiscountPercent: number; prepaidDiscountMax: number; codMaxAmount: number; exchangeWindowDays: number };
  offers: { code: string; description: string }[];
  storeAddress: string;
};

export function ProductView(p: ProductViewProps) {
  const f = { video: useSite("video"), share: useSite("share"), wishlist: useSite("wishlist"), sizeChart: useSite("sizeChart"), pincode: useSite("pincodeCheck"), reviews: useSite("reviews"), coupons: useSite("coupons"), prepaid: useSite("prepaidDiscount"), cod: useSite("cod"), exchanges: useSite("exchanges") };
  const colours = useMemo(() => [...new Map(p.variants.map((v) => [v.colour, v.colourHex])).entries()], [p.variants]);
  const firstInStock = p.variants.find((v) => v.stock > 0)?.colour ?? colours[0]?.[0];
  const [colour, setColour] = useState(firstInStock);
  const [size, setSize] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const track = useRef<HTMLDivElement>(null);

  const imgs = useMemo(() => {
    const own = p.images.filter((i) => i.colour === colour);
    return own.length ? own : p.images;
  }, [p.images, colour]);
  const sizes = p.variants.filter((v) => v.colour === colour);
  const selected = sizes.find((v) => v.size === size) ?? null;
  const off = savePercent(p.price, p.mrp);
  const prepaidOff = Math.min(Math.floor((p.price * p.settings.prepaidDiscountPercent) / 100), p.settings.prepaidDiscountMax);

  useEffect(() => {
    setSlide(0);
    track.current?.scrollTo({ left: 0 });
  }, [colour]);

  // Remember recently viewed (slug list, newest first)
  useEffect(() => {
    try {
      const k = "pg_recent";
      const cur: string[] = JSON.parse(localStorage.getItem(k) ?? "[]");
      localStorage.setItem(k, JSON.stringify([p.slug, ...cur.filter((s) => s !== p.slug)].slice(0, 12)));
    } catch {}
  }, [p.slug]);

  const onScroll = () => {
    const el = track.current;
    if (el) setSlide(Math.round(el.scrollLeft / el.clientWidth));
  };

  const buy = (now: boolean) => {
    if (!selected) {
      setError("Please select a size");
      document.getElementById("size-picker")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    start(async () => {
      setError(null);
      const r = await addToCartAction(selected.id);
      if (!r.ok) return setError(r.error ?? "Could not add to bag");
      if (now) router.push("/checkout");
      else openCart();
    });
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: p.name, url }).catch(() => {});
    else {
      await navigator.clipboard.writeText(url).catch(() => {});
      setError("Link copied");
    }
  };

  return (
    <div className="md:grid md:grid-cols-[1.1fr_1fr] md:gap-10">
      {/* Gallery */}
      <div className="relative md:sticky md:top-28 md:self-start">
        <div ref={track} onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto md:grid md:grid-cols-2 md:gap-2 md:overflow-visible">
          {imgs.map((im, i) => (
            <button key={im.id} type="button" onClick={() => setZoom(true)} className="relative aspect-[3/4] w-full shrink-0 snap-center bg-surface md:rounded" aria-label={`Zoom image ${i + 1}`}>
              <img src={im.url} alt={im.alt} loading={i === 0 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : "auto"} width={600} height={800} className="h-full w-full object-cover md:rounded" />
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 md:hidden" aria-hidden>
          {imgs.map((im, i) => (<span key={im.id} className={`h-1.5 rounded-full bg-white/80 transition-all ${i === slide ? "w-4 bg-white" : "w-1.5"}`} />))}
        </div>
        {p.videoUrl && f.video ? (
          <button type="button" onClick={() => setVideoOpen(true)} className="absolute bottom-8 left-3 flex items-center gap-1 rounded-full bg-black/65 px-3 py-1.5 text-[11px] text-white md:bottom-3"><IconPlay size={12} /> Watch video</button>
        ) : null}
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          {f.wishlist ? <WishlistButton productId={p.id} large /> : null}
          {f.share ? <button type="button" onClick={share} aria-label="Share" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-sm"><IconShare size={18} /></button> : null}
        </div>
      </div>

      {/* Buy box */}
      <div className="px-4 pt-4 md:px-0 md:pt-0">
        <h1 className="text-[17px] font-medium leading-snug md:text-2xl">{p.name}</h1>
        {f.reviews && p.ratingCount > 0 ? (
          <a href="#reviews" className="mt-1.5 flex items-center gap-2 text-xs text-muted">
            <span className="flex items-center gap-0.5 rounded-sm bg-save px-1.5 py-0.5 font-semibold text-white">{p.ratingAvg.toFixed(1)} <IconStar size={10} /></span>
            {p.ratingCount} reviews{p.fitSummary ? ` · ${p.fitSummary}` : ""}
          </a>
        ) : null}
        <p className="mt-3 text-xl font-semibold">
          {inr(p.price)}
          {off > 0 ? (<><s className="ml-2 text-sm font-normal text-muted">{inr(p.mrp)}</s><span className="ml-2 text-sm font-medium text-save">Save {off}%</span></>) : null}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
          Inclusive of all taxes · SKU {p.sku}
          {!f.exchanges ? null : p.isExchangeable ? <span className="border border-brand px-1.5 text-brand">Free Size Exchange</span> : <span className="border border-line-strong px-1.5">Non-exchangeable</span>}
        </p>

        {colours.length > 1 ? (
          <div className="mt-5">
            <p className="eyebrow mb-2 text-xs">Colour: <span className="font-normal normal-case">{colour}</span></p>
            <div className="flex gap-2">
              {colours.map(([c, hex]) => {
                const thumb = p.images.find((i) => i.colour === c);
                return (
                  <button key={c} type="button" onClick={() => { setColour(c); setSize(null); }} aria-label={c} aria-pressed={c === colour} className={`h-14 w-11 overflow-hidden rounded-sm border ${c === colour ? "ring-2 ring-dark ring-offset-1" : "border-line"}`} style={{ background: hex }}>
                    {thumb ? <img src={thumb.url} alt="" className="h-full w-full object-cover" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-5" id="size-picker">
          <div className="mb-2 flex items-center justify-between">
            <p className="eyebrow text-xs">Size</p>
            {p.chart && f.sizeChart ? (<button type="button" onClick={() => setChartOpen(true)} className="flex items-center gap-1 text-xs text-brand underline"><IconRuler size={14} /> Size Chart</button>) : null}
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
            {sizes.map((v) => (
              <button key={v.id} type="button" role="radio" aria-checked={size === v.size} disabled={v.stock === 0} onClick={() => { setSize(v.size); setError(null); }} className={`min-w-12 border px-3 py-2.5 text-sm font-medium ${v.stock === 0 ? "border-dashed border-line text-muted line-through" : size === v.size ? "border-dark bg-dark text-white" : "border-line-strong hover:border-dark"}`}>
                {v.size}
              </button>
            ))}
          </div>
          {selected && selected.stock <= 3 ? <p className="mt-2 text-xs font-medium text-danger">Only {selected.stock} left in {selected.size}</p> : null}
          {f.sizeChart && p.chart?.fitRule ? <p className="mt-2 text-xs leading-relaxed text-muted">{p.chart.fitRule}</p> : null}
          {p.modelInfo ? <p className="mt-1 text-xs text-muted">{p.modelInfo}.</p> : null}
        </div>

        {error ? <p className={`mt-3 text-sm ${error === "Link copied" ? "text-save" : "text-danger"}`} role="alert">{error}</p> : null}

        <div className="mt-5 hidden gap-3 md:flex">
          <button disabled={pending} onClick={() => buy(false)} className="btn btn-outline flex-1">Add to Bag</button>
          <button disabled={pending} onClick={() => buy(true)} className="btn btn-primary flex-1">Buy Now</button>
        </div>

        {(f.coupons && p.offers.length) || (f.prepaid && p.settings.prepaidDiscountPercent) ? (
          <div className="mt-5 border border-dashed border-gold bg-gold-soft p-3 text-[12.5px] leading-relaxed">
            <p className="font-semibold text-brand">Offers</p>
            {f.coupons && p.offers.map((o) => (<p key={o.code}>🏷 <b>{o.code}</b>: {o.description}</p>))}
            {f.prepaid && p.settings.prepaidDiscountPercent ? <p>💳 Pay online (UPI/Card) and save {inr(prepaidOff)} more on this item</p> : null}
          </div>
        ) : null}

        {f.pincode ? <PincodeCheck price={p.price} settings={p.settings} cod={f.cod} /> : null}

        <div className="mt-4 grid auto-cols-fr grid-flow-col gap-2 text-center text-[10.5px] leading-tight">
          {f.cod ? <div className="border border-line px-1 py-2.5"><IconCash className="mx-auto mb-1" />COD with OTP</div> : null}
          <div className="border border-line px-1 py-2.5"><IconTruck className="mx-auto mb-1" />{p.settings.courierShippingFee > 0 ? `Free shipping ${inr(p.settings.freeShippingThreshold)}+` : "Free shipping"}</div>
          {f.exchanges ? <div className="border border-line px-1 py-2.5"><IconSwap className="mx-auto mb-1" />{p.isExchangeable ? `${p.settings.exchangeWindowDays}-day size exchange*` : "No exchange (hygiene)"}</div> : null}
        </div>
        {f.exchanges ? <p className="mt-2 text-[11px] leading-relaxed text-muted">
          {p.isExchangeable
            ? `*First size exchange is free${shop.hasStore ? ", online or at our store," : ""} within ${p.settings.exchangeWindowDays} days of delivery. Refunds only for a defective or wrong item.`
            : "Innerwear cannot be exchanged or returned for hygiene reasons, unless the item is defective or wrong."}
        </p> : null}
        {p.storeAddress ? <p className="mt-3 flex items-center gap-2 text-xs"><IconStore size={16} /> Same piece available at our store, {p.storeAddress}</p> : null}
      </div>

      {/* Mobile sticky buy bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-line bg-white px-3 pb-[max(env(safe-area-inset-bottom),10px)] pt-2.5 md:hidden">
        <div className="text-xs leading-tight">
          <p className="font-semibold">{inr(p.price)}</p>
          {off > 0 ? <s className="text-[10.5px] text-muted">{inr(p.mrp)}</s> : null}
        </div>
        <button disabled={pending} onClick={() => buy(false)} className="btn btn-outline flex-1 px-2 py-3">Add to Bag</button>
        <button disabled={pending} onClick={() => buy(true)} className="btn btn-primary flex-1 px-2 py-3">Buy Now</button>
      </div>

      {zoom ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white" role="dialog" aria-modal="true" aria-label="Image zoom">
          <button onClick={() => setZoom(false)} className="fixed right-3 top-3 z-10 rounded-full bg-white p-2 shadow" aria-label="Close zoom"><IconClose /></button>
          {imgs.map((im) => (<img key={im.id} src={im.url} alt={im.alt} className="mx-auto w-full max-w-3xl" />))}
        </div>
      ) : null}

      {videoOpen && p.videoUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setVideoOpen(false)} role="dialog" aria-modal="true" aria-label="Product video">
          <video src={p.videoUrl} controls autoPlay playsInline className="max-h-[90vh] max-w-full" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}

      {chartOpen && p.chart && f.sizeChart ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 md:items-center md:justify-center" onClick={() => setChartOpen(false)} role="dialog" aria-modal="true" aria-label="Size chart">
          <div className="max-h-[85vh] w-full overflow-y-auto bg-white p-4 md:max-w-lg md:rounded" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="eyebrow text-sm">{p.chart.name} size chart</p>
              <button onClick={() => setChartOpen(false)} aria-label="Close" className="p-1"><IconClose /></button>
            </div>
            <table className="tbl text-center">
              <thead><tr><th>Size</th>{p.chart.columns.map((c) => (<th key={c}>{c}</th>))}</tr></thead>
              <tbody>
                {p.chart.rows.map((r) => (
                  <tr key={r.size} className={r.size === size ? "bg-brand-soft font-semibold" : ""}><td>{r.size}</td>{r.values.map((v, i) => (<td key={i}>{v}</td>))}</tr>
                ))}
              </tbody>
            </table>
            {p.chart.fitRule ? <p className="mt-3 text-sm"><b>How to pick:</b> {p.chart.fitRule}</p> : null}
            {p.chart.howToMeasure ? <p className="mt-2 text-sm text-muted">{p.chart.howToMeasure}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PincodeCheck({ price, settings, cod }: { price: number; settings: ProductViewProps["settings"]; cod: boolean }) {
  const [pin, setPin] = useState("");
  const [res, setRes] = useState<null | { serviceable: boolean; mode: string; etaDate: string; codAllowed: boolean; localFee?: number; city?: string; message?: string }>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pg_pincode");
      if (saved) {
        setPin(saved);
        check(saved);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function check(code = pin) {
    if (!/^\d{6}$/.test(code)) return setRes({ serviceable: false, mode: "", etaDate: "", codAllowed: false, message: "Enter a valid 6-digit pincode" });
    setLoading(true);
    try {
      const r = await fetch(`/api/pincode?pin=${code}`);
      setRes(await r.json());
      localStorage.setItem("pg_pincode", code);
    } finally {
      setLoading(false);
    }
  }

  const date = res?.etaDate ? new Date(res.etaDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "";
  return (
    <div className="mt-5">
      <p className="eyebrow mb-2 text-xs">Check delivery</p>
      <form onSubmit={(e) => { e.preventDefault(); check(); }} className="flex border border-line-strong">
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="postal-code" placeholder="Enter pincode" aria-label="Pincode" className="flex-1 px-3 py-2.5 text-sm outline-none" />
        <button disabled={loading} className="bg-dark px-4 text-xs font-semibold uppercase tracking-wider text-white">{loading ? "…" : "Check"}</button>
      </form>
      {res ? (
        res.serviceable ? (
          <div className="mt-2 text-[12.5px] leading-relaxed">
            <p>Get it by <b className="text-save">{date}</b>{res.mode === "LOCAL" ? " · delivered by our own team" : ""}</p>
            <p className="text-muted">
              {!cod ? "Pay online (UPI / card)" : res.codAllowed && price <= settings.codMaxAmount ? "Cash on Delivery available" : "Cash on Delivery not available, pay online"}
              {res.mode === "LOCAL" ? (res.localFee ? ` · Delivery ₹${res.localFee}` : " · Free local delivery") : price >= settings.freeShippingThreshold || settings.courierShippingFee === 0 ? " · Free shipping" : ""}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-[12.5px] text-danger">{res.message ?? "We don't deliver here yet"}</p>
        )
      ) : null}
    </div>
  );
}
