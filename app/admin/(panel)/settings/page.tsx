import { requireAdmin } from "@/lib/auth/admin";
import { getSettings } from "@/lib/settings";
import { saveSettingsAction } from "@/app/actions/admin-config";
import { ActionForm } from "@/components/admin/ActionForm";

export const metadata = { title: "Settings" };

const FIELDS: [keyof Awaited<ReturnType<typeof getSettings>>, string, string][] = [
  ["codMaxAmount", "COD allowed up to (₹)", "Orders above this must be paid online."],
  ["codFee", "COD fee (₹)", "0 = no fee. Shown to the customer before placing the order."],
  ["prepaidDiscountPercent", "Prepaid discount (%)", "Extra off for UPI/card payments."],
  ["prepaidDiscountMax", "Prepaid discount cap (₹)", "Maximum prepaid discount per order."],
  ["freeShippingThreshold", "Free shipping from (₹)", "Courier orders at or above this ship free."],
  ["courierShippingFee", "Courier shipping fee (₹)", "Charged below the free-shipping amount."],
  ["exchangeWindowDays", "Exchange window (days)", "Used everywhere: product page, policy page, order page."],
  ["codRtoBlockThreshold", "Block COD after N returned (RTO) orders", "Per phone number. Owner can re-enable from the order page."],
  ["lowStockDefault", "Low stock warning at", "Dashboard shows sizes at or below this."],
];

export default async function Settings() {
  await requireAdmin("OWNER");
  const s = await getSettings();
  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-xl font-semibold">Settings</h1>
      <p className="mb-4 text-xs text-muted">Changes apply immediately across the site, including policy pages and badges, so what the site promises always matches these rules.</p>
      <section className="border border-line bg-white p-4">
        <ActionForm action={saveSettingsAction} submit="Save settings">
          <div className="grid gap-4 md:grid-cols-2">
            {FIELDS.map(([k, label, help]) => (
              <div key={k}><label className="label" htmlFor={k}>{label}</label><input id={k} name={k} type="number" min={0} defaultValue={s[k]} required className="input" /><p className="mt-1 text-[11px] text-muted">{help}</p></div>
            ))}
          </div>
        </ActionForm>
      </section>
      <p className="mt-4 text-xs text-muted">Shop name, address, phone and GSTIN come from the server environment (NEXT_PUBLIC_SHOP_* and SHOP_GSTIN) and change with a redeploy.</p>
    </div>
  );
}
