"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IconClose, IconFilter } from "../icons";
import { useSite } from "./SiteFlags";

type Facets = { sizes: string[]; colours: { name: string; hex: string }[]; attrs: Record<string, string[]>; minPrice: number; maxPrice: number };

const LABELS: Record<string, string> = { occasion: "Occasion", fabric: "Fabric", sleeve: "Sleeve", length: "Length", pattern: "Pattern", neck: "Neck" };
const PRICE_BANDS = [[0, 499], [500, 999], [1000, 1499], [1500, 2499], [2500, 99999]] as const;
const SORTS = [
  ["recommended", "Recommended"],
  ["new", "Newest"],
  ["bestselling", "Bestselling"],
  ["price-asc", "Price: Low to High"],
  ["price-desc", "Price: High to Low"],
] as const;

type Sel = Record<string, string[]>;

function fromParams(sp: URLSearchParams): Sel {
  const s: Sel = {};
  for (const k of ["size", "colour", ...Object.keys(LABELS)]) {
    const v = sp.get(k);
    if (v) s[k] = v.split(",");
  }
  const min = sp.get("min");
  const max = sp.get("max");
  if (min || max) s.price = [`${min ?? 0}-${max ?? 99999}`];
  return s;
}

function toParams(sel: Sel, sort: string | null) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sel)) {
    if (!v.length) continue;
    if (k === "price") {
      const [min, max] = v[0].split("-");
      if (Number(min) > 0) p.set("min", min);
      if (Number(max) < 99999) p.set("max", max);
    } else p.set(k, v.join(","));
  }
  if (sort && sort !== "recommended") p.set("sort", sort);
  return p;
}

export function FilterBar({ slug, facets, total }: { slug: string; facets: Facets; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const filtersOn = useSite("filters");
  const sortOn = useSite("sort");
  const [open, setOpen] = useState<null | "filter" | "sort">(null);
  const [sel, setSel] = useState<Sel>(() => fromParams(sp));
  const [count, setCount] = useState<number | null>(total);
  const sort = sp.get("sort") ?? "recommended";
  const applied = useMemo(() => fromParams(sp), [sp]);
  const appliedCount = Object.values(applied).reduce((n, v) => n + v.length, 0);

  useEffect(() => setSel(fromParams(sp)), [sp]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  // Live "Apply (N items)" count while choosing filters
  useEffect(() => {
    if (open !== "filter") return;
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/collection-count?slug=${encodeURIComponent(slug)}&${toParams(sel, null)}`, { signal: ctl.signal })
        .then((r) => r.json())
        .then((j) => setCount(j.total))
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [sel, open, slug]);

  const toggle = (k: string, v: string, single = false) =>
    setSel((s) => {
      const cur = s[k] ?? [];
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : single ? [v] : [...cur, v];
      return { ...s, [k]: next };
    });

  const apply = (nextSel: Sel, nextSort = sort) => {
    const q = toParams(nextSel, nextSort).toString();
    router.push(q ? `${pathname}?${q}` : pathname, { scroll: false });
    setOpen(null);
  };

  const chip = (k: string, v: string, label = v, single = false) => {
    const on = sel[k]?.includes(v);
    return (
      <button key={v} type="button" onClick={() => toggle(k, v, single)} aria-pressed={on} className={`border px-3 py-2 text-sm ${on ? "border-dark bg-dark text-white" : "border-line-strong"}`}>
        {label}
      </button>
    );
  };

  if (!filtersOn && !sortOn) return <div className="my-4" />;
  return (
    <>
      <div className="sticky top-[97px] z-30 -mx-4 my-4 flex border-y border-line bg-white md:top-[99px]">
        {filtersOn ? <button onClick={() => setOpen("filter")} className="flex flex-1 items-center justify-center gap-2 border-r border-line py-3 text-xs font-semibold uppercase tracking-wider">
          <IconFilter size={16} /> Filter {appliedCount ? <span className="rounded-full bg-brand px-1.5 text-[10px] text-white">{appliedCount}</span> : null}
        </button> : null}
        {sortOn ? <button onClick={() => setOpen("sort")} className="flex-1 py-3 text-xs font-semibold uppercase tracking-wider">
          Sort: <span className="font-normal normal-case">{SORTS.find((s) => s[0] === sort)?.[1]}</span>
        </button> : null}
      </div>
      {appliedCount ? (
        <div className="-mt-2 mb-4 flex flex-wrap gap-2">
          {Object.entries(applied).flatMap(([k, vals]) =>
            vals.map((v) => (
              <button key={k + v} onClick={() => apply({ ...applied, [k]: applied[k].filter((x) => x !== v) })} className="flex items-center gap-1 bg-surface px-2.5 py-1 text-xs">
                {k === "price" ? `₹${v.replace("-99999", "+").replace("-", "–₹")}` : v} <IconClose size={12} />
              </button>
            )),
          )}
          <button onClick={() => apply({})} className="px-2 py-1 text-xs underline">Clear all</button>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 md:items-center md:justify-center" onClick={() => setOpen(null)} role="dialog" aria-modal="true" aria-label={open === "filter" ? "Filters" : "Sort"}>
          <div className="flex max-h-[85vh] w-full flex-col bg-white md:max-w-lg md:rounded" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="eyebrow text-sm">{open === "filter" ? "Filters" : "Sort by"}</p>
              <button onClick={() => setOpen(null)} aria-label="Close" className="p-1"><IconClose /></button>
            </div>
            {open === "sort" ? (
              <ul className="p-2">
                {SORTS.map(([v, l]) => (
                  <li key={v}>
                    <button onClick={() => apply(applied, v)} className={`w-full px-3 py-3 text-left text-sm ${v === sort ? "font-semibold text-brand" : ""}`}>{l}</button>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <div className="flex-1 space-y-5 overflow-y-auto p-4">
                  {facets.sizes.length ? (<fieldset><legend className="eyebrow mb-2 text-xs">Size</legend><div className="flex flex-wrap gap-2">{facets.sizes.map((s) => chip("size", s))}</div></fieldset>) : null}
                  <fieldset>
                    <legend className="eyebrow mb-2 text-xs">Price</legend>
                    <div className="flex flex-wrap gap-2">
                      {PRICE_BANDS.filter(([a, b]) => b >= facets.minPrice && a <= facets.maxPrice).map(([a, b]) => chip("price", `${a}-${b}`, b === 99999 ? `₹${a}+` : `₹${a}–₹${b}`, true))}
                    </div>
                  </fieldset>
                  {facets.colours.length > 1 ? (
                    <fieldset>
                      <legend className="eyebrow mb-2 text-xs">Colour</legend>
                      <div className="flex flex-wrap gap-2">
                        {facets.colours.map((c) => {
                          const on = sel.colour?.includes(c.name);
                          return (
                            <button key={c.name} type="button" onClick={() => toggle("colour", c.name)} aria-pressed={on} className={`flex items-center gap-1.5 border px-2.5 py-1.5 text-sm ${on ? "border-dark" : "border-line-strong"}`}>
                              <span className="h-4 w-4 rounded-full border border-line" style={{ background: c.hex }} />{c.name}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  ) : null}
                  {Object.entries(LABELS).map(([k, label]) =>
                    facets.attrs[k]?.length > 1 ? (<fieldset key={k}><legend className="eyebrow mb-2 text-xs">{label}</legend><div className="flex flex-wrap gap-2">{facets.attrs[k].map((v) => chip(k, v))}</div></fieldset>) : null,
                  )}
                </div>
                <div className="sticky bottom-0 flex gap-2 border-t border-line bg-white p-3">
                  <button onClick={() => setSel({})} className="btn btn-outline flex-1">Clear</button>
                  <button onClick={() => apply(sel)} className="btn btn-primary flex-[2]">Apply {count != null ? `(${count} items)` : ""}</button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
