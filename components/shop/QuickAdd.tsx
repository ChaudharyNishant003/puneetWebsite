"use client";
import { useState, useTransition } from "react";
import { addToCartAction } from "@/app/actions/cart";
import { inr } from "@/lib/format";
import { IconClose } from "../icons";
import { openCart } from "./cart-events";

type V = { id: string; size: string; colour: string; colourHex: string; stock: number };

export function QuickAdd({ product }: { product: { name: string; slug: string; price: number; variants: V[]; image?: string } }) {
  const colours = [...new Map(product.variants.map((v) => [v.colour, v.colourHex])).entries()];
  const [open, setOpen] = useState(false);
  const [colour, setColour] = useState(colours[0]?.[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const sizes = product.variants.filter((v) => v.colour === colour);

  const add = (variantId: string) =>
    start(async () => {
      setError(null);
      const r = await addToCartAction(variantId);
      if (!r.ok) setError(r.error ?? "Could not add");
      else {
        setOpen(false);
        openCart();
      }
    });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-2 w-full border border-dark py-1.5 text-[10.5px] font-semibold uppercase tracking-wider hover:bg-dark hover:text-white">
        Quick Add
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label={`Choose size for ${product.name}`}>
          <div className="w-full max-w-md bg-white p-4 pb-6 sm:rounded" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              {product.image ? <img src={product.image} alt="" className="h-20 w-15 rounded object-cover" width={60} height={80} /> : null}
              <div className="flex-1">
                <p className="text-sm font-medium leading-snug">{product.name}</p>
                <p className="text-sm font-semibold">{inr(product.price)}</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="p-1"><IconClose /></button>
            </div>
            {colours.length > 1 ? (
              <div className="mt-4">
                <p className="eyebrow mb-2 text-xs">Colour: {colour}</p>
                <div className="flex gap-2">
                  {colours.map(([c, hex]) => (
                    <button key={c} onClick={() => setColour(c)} aria-label={c} aria-pressed={c === colour} className={`h-8 w-8 rounded-full border ${c === colour ? "ring-2 ring-dark ring-offset-2" : ""}`} style={{ background: hex }} />
                  ))}
                </div>
              </div>
            ) : null}
            <p className="eyebrow mb-2 mt-4 text-xs">Select size</p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((v) => (
                <button key={v.id} disabled={v.stock === 0 || pending} onClick={() => add(v.id)} className={`min-w-12 border px-3 py-2.5 text-sm font-medium ${v.stock === 0 ? "border-dashed border-line text-muted line-through" : "border-line-strong hover:border-dark"}`}>
                  {v.size}
                </button>
              ))}
            </div>
            {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
            <a href={`/p/${product.slug}`} className="mt-4 block text-center text-xs text-brand underline">View full details</a>
          </div>
        </div>
      ) : null}
    </>
  );
}
