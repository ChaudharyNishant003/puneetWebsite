import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { requirePage } from "@/lib/flags";
import { inr } from "@/lib/format";
import { deletePincodeAction, savePincodesAction } from "@/app/actions/admin-config";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";

export const metadata = { title: "Pincodes" };

export default async function Pincodes() {
  await requireAdmin();
  await requirePage("pincodes");
  const list = await db.pincode.findMany({ orderBy: [{ isLocal: "desc" }, { code: "asc" }] });
  return (
    <div className="max-w-4xl">
      <h1 className="mb-1 text-xl font-semibold">Pincodes</h1>
      <p className="mb-4 text-xs text-muted">Local pincodes are delivered by your own team (your fee and days). All others go by courier with Shiprocket dates. Turn COD off for pincodes with many refusals.</p>
      <section className="mb-6 border border-line bg-white p-4">
        <ActionForm action={savePincodesAction} submit="Save pincodes" reset>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-4"><label className="label" htmlFor="codes">Pincodes (comma or space separated)</label><textarea id="codes" name="codes" rows={2} required className="input" placeholder="302001, 302002" /></div>
            <div><label className="label" htmlFor="city">Area / city</label><input id="city" name="city" className="input" /></div>
            <div><label className="label" htmlFor="localFee">Local delivery fee ₹</label><input id="localFee" name="localFee" type="number" min={0} defaultValue={0} className="input" /></div>
            <div><label className="label" htmlFor="localEtaDays">Delivery days</label><input id="localEtaDays" name="localEtaDays" type="number" min={0} max={10} defaultValue={1} className="input" /></div>
            <div className="flex flex-col justify-end gap-1 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" name="isLocal" defaultChecked /> Local (own delivery)</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="codAllowed" defaultChecked /> COD allowed</label>
            </div>
          </div>
        </ActionForm>
      </section>
      <div className="overflow-x-auto border border-line bg-white">
        <table className="tbl">
          <thead><tr><th>Pincode</th><th>Area</th><th>Delivery</th><th>COD</th><th></th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.code}>
                <td className="font-medium">{p.code}</td><td className="text-xs">{p.city ?? "—"}</td>
                <td className="text-xs">{p.isLocal ? `Local · ${p.localFee ? inr(p.localFee) : "free"} · ${p.localEtaDays} day(s)` : "Courier"}</td>
                <td className="text-xs">{p.codAllowed ? "Yes" : <b className="text-danger">No</b>}</td>
                <td><ActionButton action={deletePincodeAction.bind(null, p.code)} confirmText={`Remove ${p.code}?`} className="text-xs text-danger underline">Remove</ActionButton></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
