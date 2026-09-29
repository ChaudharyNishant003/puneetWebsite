"use client";
import { useActionState } from "react";
import { saveProductAction, archiveProductAction } from "@/app/actions/admin-products";
import { ATTR_KEYS, ATTR_LABELS } from "@/lib/constants";

type P = {
  id: string; name: string; slug: string; description: string; categoryId: string; gender: string; price: number; mrp: number; hsn: string; gstRate: number;
  badges: string; modelInfo: string; status: string; isFeatured: boolean; storeBestseller: boolean; isExchangeable: boolean; isInnerwear: boolean; seoTitle: string; seoDescription: string;
};

export function ProductForm({ product: p, attrs, categories }: { product: P | null; attrs: Record<string, string>; categories: { id: string; name: string; gender: string }[] }) {
  const [state, action, pending] = useActionState(saveProductAction, null);
  return (
    <form action={action} className="space-y-5 border border-line bg-white p-4">
      {p ? <input type="hidden" name="id" value={p.id} /> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2"><label className="label" htmlFor="name">Name</label><input id="name" name="name" defaultValue={p?.name} required className="input" /></div>
        <div>
          <label className="label" htmlFor="categoryId">Category</label>
          <select id="categoryId" name="categoryId" defaultValue={p?.categoryId ?? ""} required className="input">
            <option value="">Select</option>
            {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="gender">For</label>
          <select id="gender" name="gender" defaultValue={p?.gender ?? "WOMEN"} className="input"><option value="WOMEN">Women</option><option value="MEN">Men</option><option value="KIDS">Kids</option><option value="UNISEX">Everyone</option></select>
        </div>
        <div><label className="label" htmlFor="price">Selling price (₹, incl. GST)</label><input id="price" name="price" type="number" min={1} defaultValue={p?.price} required className="input" /></div>
        <div><label className="label" htmlFor="mrp">MRP (₹) — use the real MRP</label><input id="mrp" name="mrp" type="number" min={1} defaultValue={p?.mrp} required className="input" /></div>
        <div className="md:col-span-2"><label className="label" htmlFor="description">Description</label><textarea id="description" name="description" rows={4} defaultValue={p?.description} required className="input" /></div>
        <div><label className="label" htmlFor="modelInfo">Model info (e.g. Model is 5&apos;4&quot; wearing M)</label><input id="modelInfo" name="modelInfo" defaultValue={p?.modelInfo} className="input" /></div>
        <div><label className="label" htmlFor="badges">Badges (comma separated, max 3: New, Bestseller, Festive)</label><input id="badges" name="badges" defaultValue={p?.badges} className="input" /></div>
        <div><label className="label" htmlFor="status">Status</label><select id="status" name="status" defaultValue={p?.status ?? "DRAFT"} className="input"><option value="DRAFT">Draft (hidden)</option><option value="ACTIVE">Active (visible)</option><option value="ARCHIVED">Archived</option></select></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="hsn">HSN code</label><input id="hsn" name="hsn" defaultValue={p?.hsn ?? "6211"} className="input" /></div>
          <div><label className="label" htmlFor="gstRate">GST % (blank = auto)</label><input id="gstRate" name="gstRate" type="number" defaultValue={p?.gstRate} className="input" /></div>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="isFeatured" defaultChecked={p?.isFeatured} /> Featured</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="storeBestseller" defaultChecked={p?.storeBestseller} /> Store bestseller (homepage rail)</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="isExchangeable" defaultChecked={p?.isExchangeable ?? true} /> Size exchange allowed</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="isInnerwear" defaultChecked={p?.isInnerwear} /> Innerwear / hygiene item (never exchangeable)</label>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Details shown on the product page</legend>
        <p className="mb-2 text-xs text-muted">Fill what applies. Separate multiple values with commas. Occasion and fabric power the filters and search.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {ATTR_KEYS.map((k) => (<div key={k}><label className="label" htmlFor={`attr_${k}`}>{ATTR_LABELS[k]}</label><input id={`attr_${k}`} name={`attr_${k}`} defaultValue={attrs[k]} className="input" /></div>))}
        </div>
      </fieldset>
      <details>
        <summary className="cursor-pointer text-sm font-semibold">SEO (optional)</summary>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <div><label className="label" htmlFor="slug">Page link /p/…</label><input id="slug" name="slug" defaultValue={p?.slug} className="input" /></div>
          <div><label className="label" htmlFor="seoTitle">SEO title</label><input id="seoTitle" name="seoTitle" maxLength={70} defaultValue={p?.seoTitle} className="input" /></div>
          <div className="md:col-span-2"><label className="label" htmlFor="seoDescription">SEO description</label><input id="seoDescription" name="seoDescription" maxLength={170} defaultValue={p?.seoDescription} className="input" /></div>
        </div>
      </details>
      {state?.error ? <p className="text-sm text-danger" role="alert">{state.error}</p> : state?.ok ? <p className="text-sm text-save">Saved ✓</p> : null}
      <div className="flex gap-2">
        <button disabled={pending} className="btn btn-primary">{pending ? "Saving…" : p ? "Save changes" : "Create product"}</button>
        {p && p.status !== "ARCHIVED" ? <button type="button" onClick={async () => { if (confirm("Archive this product? It will be hidden from the store.")) { await archiveProductAction(p.id); location.reload(); } }} className="btn btn-outline text-danger">Archive</button> : null}
      </div>
    </form>
  );
}
