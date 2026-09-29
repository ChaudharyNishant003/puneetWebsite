import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { requirePage } from "@/lib/flags";
import { fmtDate, inr } from "@/lib/format";
import { saveCouponAction, toggleCouponAction } from "@/app/actions/admin-config";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";

export const metadata = { title: "Coupons" };

export default async function Coupons() {
  await requireAdmin();
  await requirePage("coupons");
  const list = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="max-w-4xl">
      <h1 className="mb-4 text-xl font-semibold">Coupons</h1>
      <div className="mb-6 overflow-x-auto border border-line bg-white">
        <table className="tbl min-w-[640px]">
          <thead><tr><th>Code</th><th>Offer</th><th>Rules</th><th>Used</th><th></th></tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className={c.active ? "" : "opacity-50"}>
                <td className="font-semibold">{c.code}</td>
                <td className="text-xs">{c.type === "FLAT" ? inr(c.value) : `${c.value}%`}{c.maxDiscount ? ` (max ${inr(c.maxDiscount)})` : ""}<br /><span className="text-muted">{c.description}</span></td>
                <td className="text-xs">{c.minCart ? `Min ${inr(c.minCart)}` : "No minimum"}{c.prepaidOnly ? " · prepaid only" : ""}{c.firstOrderOnly ? " · first order" : ""}{c.endsAt ? ` · till ${fmtDate(c.endsAt, { day: "numeric", month: "short" })}` : ""}</td>
                <td className="text-xs">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
                <td><ActionButton action={toggleCouponAction.bind(null, c.code, !c.active)}>{c.active ? "Turn off" : "Turn on"}</ActionButton></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="border border-line bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold">Add or update a coupon</h2>
        <p className="mb-3 text-xs text-muted">Saving an existing code updates it.</p>
        <ActionForm action={saveCouponAction} submit="Save coupon" reset>
          <div className="grid gap-3 md:grid-cols-3">
            <div><label className="label" htmlFor="code">Code</label><input id="code" name="code" required className="input uppercase" /></div>
            <div><label className="label" htmlFor="type">Type</label><select id="type" name="type" className="input"><option value="FLAT">₹ off</option><option value="PERCENT">% off</option></select></div>
            <div><label className="label" htmlFor="value">Value</label><input id="value" name="value" type="number" min={1} required className="input" /></div>
            <div className="md:col-span-3"><label className="label" htmlFor="description">Shown to customers</label><input id="description" name="description" required className="input" placeholder="₹100 off on orders above ₹999" /></div>
            <div><label className="label" htmlFor="minCart">Minimum cart ₹</label><input id="minCart" name="minCart" type="number" min={0} defaultValue={0} className="input" /></div>
            <div><label className="label" htmlFor="maxDiscount">Max discount ₹ (for %)</label><input id="maxDiscount" name="maxDiscount" type="number" min={0} className="input" /></div>
            <div><label className="label" htmlFor="usageLimit">Total uses allowed</label><input id="usageLimit" name="usageLimit" type="number" min={1} className="input" /></div>
            <div><label className="label" htmlFor="endsAt">Valid till</label><input id="endsAt" name="endsAt" type="date" className="input" /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="prepaidOnly" /> Prepaid only</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="firstOrderOnly" /> First order only</label>
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
