"use client";
import { useMemo, useState, useTransition } from "react";
import { saveVariantsAction } from "@/app/actions/admin-products";

type Row = { id?: string; size: string; colour: string; colourHex: string; stock: number };

// Grid editor: colours as rows, sizes as columns, stock in each cell.
export function VariantEditor({ productId, initial, sizeHint }: { productId: string; initial: Row[]; sizeHint: string[] }) {
  const [sizes, setSizes] = useState<string[]>(() => (initial.length ? [...new Set(initial.map((r) => r.size))] : sizeHint.slice(0, 6)));
  const [colours, setColours] = useState<{ name: string; hex: string }[]>(() => {
    const m = new Map(initial.map((r) => [r.colour, r.colourHex]));
    return m.size ? [...m].map(([name, hex]) => ({ name, hex })) : [];
  });
  const [stock, setStock] = useState<Record<string, number>>(() => Object.fromEntries(initial.map((r) => [`${r.colour}|${r.size}`, r.stock])));
  const [newSize, setNewSize] = useState("");
  const [newColour, setNewColour] = useState({ name: "", hex: "#8e1b3a" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const total = useMemo(() => colours.reduce((s, c) => s + sizes.reduce((t, sz) => t + (stock[`${c.name}|${sz}`] ?? 0), 0), 0), [colours, sizes, stock]);

  const save = () =>
    start(async () => {
      const rows = colours.flatMap((c) => sizes.map((sz) => ({ size: sz, colour: c.name, colourHex: c.hex, stock: stock[`${c.name}|${sz}`] ?? 0 })));
      const r = await saveVariantsAction(productId, rows);
      setMsg(r.ok ? { ok: true, text: "Stock saved ✓" } : { ok: false, text: r.error ?? "Failed" });
    });

  return (
    <section className="border border-line bg-white p-4">
      <h2 className="text-sm font-semibold">Sizes, colours & stock <span className="font-normal text-muted">(total {total})</span></h2>
      <div className="mt-3 flex flex-wrap items-end gap-2 text-sm">
        <div><label className="label" htmlFor="ns">Add size</label><input id="ns" value={newSize} onChange={(e) => setNewSize(e.target.value.toUpperCase())} className="input w-24 py-1.5" placeholder="M" /></div>
        <button type="button" onClick={() => { if (newSize && !sizes.includes(newSize)) setSizes([...sizes, newSize]); setNewSize(""); }} className="btn btn-outline py-1.5">+ Size</button>
        {sizeHint.filter((s) => !sizes.includes(s)).length ? <span className="text-xs text-muted">Quick add: {sizeHint.filter((s) => !sizes.includes(s)).map((s) => (<button type="button" key={s} onClick={() => setSizes([...sizes, s])} className="ml-1 underline">{s}</button>))}</span> : null}
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-2 text-sm">
        <div><label className="label" htmlFor="nc">Add colour</label><input id="nc" value={newColour.name} onChange={(e) => setNewColour({ ...newColour, name: e.target.value })} className="input w-36 py-1.5" placeholder="Maroon" /></div>
        <input type="color" value={newColour.hex} onChange={(e) => setNewColour({ ...newColour, hex: e.target.value })} aria-label="Colour swatch" className="h-9 w-10" />
        <button type="button" onClick={() => { const n = newColour.name.trim(); if (n && !colours.some((c) => c.name === n)) setColours([...colours, { name: n, hex: newColour.hex }]); setNewColour({ name: "", hex: newColour.hex }); }} className="btn btn-outline py-1.5">+ Colour</button>
      </div>
      {colours.length && sizes.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="tbl w-auto">
            <thead><tr><th>Colour</th>{sizes.map((s) => (<th key={s} className="text-center">{s} <button type="button" onClick={() => setSizes(sizes.filter((x) => x !== s))} aria-label={`Remove size ${s}`} className="text-danger">×</button></th>))}</tr></thead>
            <tbody>
              {colours.map((c) => (
                <tr key={c.name}>
                  <td className="whitespace-nowrap"><span className="mr-1.5 inline-block h-3 w-3 rounded-full align-middle" style={{ background: c.hex }} />{c.name} <button type="button" onClick={() => setColours(colours.filter((x) => x.name !== c.name))} aria-label={`Remove ${c.name}`} className="text-danger">×</button></td>
                  {sizes.map((s) => (
                    <td key={s}><input type="number" min={0} value={stock[`${c.name}|${s}`] ?? 0} onChange={(e) => setStock({ ...stock, [`${c.name}|${s}`]: Math.max(0, Number(e.target.value) || 0) })} aria-label={`${c.name} ${s} stock`} className="input w-16 px-1.5 py-1 text-center" /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted">Add at least one size and one colour.</p>
      )}
      {msg ? <p className={`mt-2 text-sm ${msg.ok ? "text-save" : "text-danger"}`}>{msg.text}</p> : null}
      <button type="button" onClick={save} disabled={pending || !colours.length || !sizes.length} className="btn btn-primary mt-3">{pending ? "Saving…" : "Save stock"}</button>
    </section>
  );
}
