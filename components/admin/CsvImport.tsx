"use client";
import { useActionState, useState } from "react";
import { csvTemplate, importCsvAction } from "@/app/actions/admin-products";

export function CsvImport() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(importCsvAction, null);

  const downloadTemplate = async () => {
    const text = await csvTemplate();
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "products-template.csv" });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mb-3">
      <button onClick={() => setOpen(!open)} className="text-xs text-brand underline">{open ? "Hide bulk import" : "Bulk import from CSV / Excel"}</button>
      {open ? (
        <div className="mt-2 border border-line bg-white p-4 text-sm">
          <p className="text-xs text-muted">One row per size/colour. Rows with the same <b>handle</b> become one product. Multiple values (badges, attributes, image_urls) are separated with <b>|</b>. Save an Excel sheet as “CSV UTF-8”. Existing products (same handle) are updated.</p>
          <button type="button" onClick={downloadTemplate} className="mt-2 text-xs text-brand underline">Download template</button>
          <form action={action} className="mt-3 flex flex-wrap items-center gap-2">
            <input type="file" name="file" accept=".csv,text/csv" required className="text-xs" />
            <button disabled={pending} className="btn btn-dark py-2">{pending ? "Importing…" : "Import"}</button>
          </form>
          {state?.error ? <p className="mt-2 text-danger">{state.error}</p> : null}
          {state?.summary ? (
            <div className="mt-2">
              <p className="text-save">Created {state.summary.created}, updated {state.summary.updated} products · {state.summary.variants} variants</p>
              {state.summary.problems.length ? <ul className="mt-1 list-disc pl-5 text-xs text-danger">{state.summary.problems.slice(0, 20).map((p) => (<li key={p}>{p}</li>))}</ul> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
