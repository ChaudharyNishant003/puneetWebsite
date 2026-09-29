import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth/session";
import { deleteAddressAction } from "@/app/actions/account";
import { LoginGate } from "@/components/shop/LoginGate";

export const metadata: Metadata = { title: "Saved Addresses", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const s = await getCustomerSession();
  if (!s) return <LoginGate />;
  const list = await db.address.findMany({ where: { customerId: s.sub }, orderBy: { createdAt: "desc" } });
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="eyebrow mb-4 text-lg">Saved Addresses</h1>
      {!list.length ? <p className="text-sm text-muted">Addresses you use at checkout are saved here.</p> : null}
      <ul className="space-y-3">
        {list.map((a) => (
          <li key={a.id} className="flex justify-between gap-3 border border-line p-3 text-sm">
            <p><b>{a.name}</b> · {a.phone}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}</p>
            <form action={deleteAddressAction.bind(null, a.id)}><button className="text-xs text-danger underline">Delete</button></form>
          </li>
        ))}
      </ul>
    </div>
  );
}
