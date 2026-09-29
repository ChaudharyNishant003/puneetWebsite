"use client";
import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { applyCouponAction, changeVariantAction, setQtyAction } from "@/app/actions/cart";
import { inr } from "@/lib/format";
import { IconBag, IconClose } from "../icons";
import { CART_OPEN } from "./cart-events";

type Item = {
  id: string; qty: number; size: string; colour: string; stock: number; name: string; slug: string; price: number; mrp: number;
  image: string | null; isExchangeable: boolean; sizes: { id: string; size: string; stock: number }[];
};
type Cart = {
  count: number; couponCode: string | null; couponDescription: string | null; items: Item[];
  pricing: { subtotal: number; mrpTotal: number; couponDiscount: number; couponError: string | null; amountToFreeShipping: number; total: number; shippingFee: number };
};

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [coupon, setCoupon] = useState("");
  const [showCoupon, setShowCoupon] = useState(false);
  const pathname = usePathname();

  const load = useCallback(async () => {
    const r = await fetch("/api/cart", { cache: "no-store" });
    setCart(await r.json());
  }, []);

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      load();
    };
    window.addEventListener(CART_OPEN, onOpen);
    return () => window.removeEventListener(CART_OPEN, onOpen);
  }, [load]);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setMsg(null);
      const r = await fn();
      if (!r.ok) setMsg(r.error ?? "Something went wrong");
      await load();
    });

  if (!open) return null;
  const p = cart?.pricing;
  const freeShipPct = p ? Math.min(100, Math.round((p.subtotal / (p.subtotal + p.amountToFreeShipping || 1)) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="Your bag">
      <div className="flex h-full w-full max-w-md flex-col bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="eyebrow text-sm">Your Bag {cart ? `(${cart.count})` : ""}</p>
          <button onClick={() => setOpen(false)} aria-label="Close bag" className="p-1"><IconClose /></button>
        </div>

        {!cart ? (
          <p className="p-6 text-sm text-muted">Loading…</p>
        ) : cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <IconBag size={40} className="text-muted" />
            <p className="font-medium">Your bag is empty</p>
            <Link href="/c/new-arrivals" className="btn btn-dark">Shop New Arrivals</Link>
          </div>
        ) : (
          <>
            {p ? (
              <div className="border-b border-line bg-surface px-4 py-3 text-xs">
                {p.amountToFreeShipping > 0 ? (
                  <p>Add <b>{inr(p.amountToFreeShipping)}</b> more for <b>free shipping</b></p>
                ) : (
                  <p className="font-medium text-save">You get free shipping on this order</p>
                )}
                <div className="mt-2 h-1.5 overflow-hidden rounded bg-line"><div className="h-full bg-save transition-all" style={{ width: `${freeShipPct}%` }} /></div>
              </div>
            ) : null}
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-4">
              {cart.items.map((i) => (
                <li key={i.id} className="flex gap-3 py-4">
                  <Link href={`/p/${i.slug}`} className="shrink-0">
                    {i.image ? <img src={i.image} alt={i.name} width={72} height={96} className="h-24 w-18 rounded object-cover" /> : null}
                  </Link>
                  <div className="min-w-0 flex-1 text-sm">
                    <Link href={`/p/${i.slug}`} className="line-clamp-2 leading-snug">{i.name}</Link>
                    <p className="text-xs text-muted">{i.colour}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <label className="sr-only" htmlFor={`size-${i.id}`}>Size</label>
                      <select id={`size-${i.id}`} disabled={pending} value={i.sizes.find((s) => s.size === i.size)?.id} onChange={(e) => run(() => changeVariantAction(i.id, e.target.value))} className="border border-line-strong px-2 py-1 text-xs">
                        {i.sizes.map((s) => (<option key={s.id} value={s.id} disabled={s.stock === 0}>Size {s.size}{s.stock === 0 ? " (sold out)" : ""}</option>))}
                      </select>
                      <div className="flex items-center border border-line-strong text-xs">
                        <button disabled={pending} onClick={() => run(() => setQtyAction(i.id, i.qty - 1))} className="px-2 py-1" aria-label="Decrease quantity">−</button>
                        <span className="w-6 text-center" aria-live="polite">{i.qty}</span>
                        <button disabled={pending || i.qty >= i.stock} onClick={() => run(() => setQtyAction(i.id, i.qty + 1))} className="px-2 py-1" aria-label="Increase quantity">+</button>
                      </div>
                    </div>
                    {!i.isExchangeable ? <p className="mt-1 text-[11px] text-muted">Not exchangeable (innerwear)</p> : null}
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">{inr(i.price * i.qty)}</p>
                    {i.mrp > i.price ? <s className="text-xs text-muted">{inr(i.mrp * i.qty)}</s> : null}
                    <button disabled={pending} onClick={() => run(() => setQtyAction(i.id, 0))} className="mt-2 block text-xs text-muted underline">Remove</button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-line p-4">
              {msg ? <p className="mb-2 text-xs text-danger" role="alert">{msg}</p> : null}
              {cart.couponCode ? (
                <div className="mb-3 flex items-center justify-between border border-dashed border-gold bg-gold-soft px-3 py-2 text-xs">
                  <span><b>{cart.couponCode}</b> {p?.couponError ? <span className="text-danger">· {p.couponError}</span> : <span className="text-save">applied · −{inr(p?.couponDiscount ?? 0)}</span>}</span>
                  <button onClick={() => run(() => applyCouponAction(""))} className="underline">Remove</button>
                </div>
              ) : showCoupon ? (
                <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); run(() => applyCouponAction(coupon)); }}>
                  <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Coupon code" aria-label="Coupon code" className="input py-2 text-xs uppercase" />
                  <button className="btn btn-outline py-2" disabled={pending || !coupon}>Apply</button>
                </form>
              ) : (
                <button onClick={() => setShowCoupon(true)} className="mb-3 text-xs text-brand underline">Have a coupon code?</button>
              )}
              <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-semibold">{inr((p?.subtotal ?? 0) - (p?.couponDiscount ?? 0))}</span></div>
              {p && p.mrpTotal > p.subtotal ? <p className="text-right text-xs text-save">You save {inr(p.mrpTotal - p.subtotal + p.couponDiscount)}</p> : null}
              <p className="mt-1 text-[11px] text-muted">Delivery date, shipping and prepaid offer shown at checkout.</p>
              <Link href="/checkout" className="btn btn-primary mt-3 w-full">Checkout</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
