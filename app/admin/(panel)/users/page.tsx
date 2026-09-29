import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { fmtDateTime } from "@/lib/format";
import { createAdminUserAction, setAdminUserActiveAction } from "@/app/actions/admin-config";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { ResetPassword } from "@/components/admin/ResetPassword";

export const metadata = { title: "Users" };

export default async function Users() {
  const me = await requireAdmin("OWNER");
  const [users, log] = await Promise.all([
    db.adminUser.findMany({ orderBy: { createdAt: "asc" } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
  ]);
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-xl font-semibold">Users</h1>
      <div className="overflow-x-auto border border-line bg-white">
        <table className="tbl">
          <thead><tr><th>Name</th><th>Role</th><th>Last login</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.active ? "" : "opacity-50"}>
                <td>{u.name}<br /><span className="text-xs text-muted">{u.email}</span></td>
                <td className="text-xs">{u.role === "OWNER" ? "Owner" : "Staff"}</td>
                <td className="text-xs">{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : "Never"}</td>
                <td className="space-x-3 whitespace-nowrap">
                  <ResetPassword id={u.id} />
                  {u.id !== me.id ? <ActionButton action={setAdminUserActiveAction.bind(null, u.id, !u.active)} className="text-xs underline">{u.active ? "Deactivate" : "Activate"}</ActionButton> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="border border-line bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold">Add a user</h2>
        <p className="mb-3 text-xs text-muted">Staff can manage products, stock, orders, exchanges, reviews, coupons and pincodes. Only owners see settings, reports and users.</p>
        <ActionForm action={createAdminUserAction} submit="Add user" reset>
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className="label" htmlFor="u-name">Name</label><input id="u-name" name="name" required className="input" /></div>
            <div><label className="label" htmlFor="u-email">Email</label><input id="u-email" name="email" type="email" required className="input" /></div>
            <div><label className="label" htmlFor="u-role">Role</label><select id="u-role" name="role" className="input"><option value="STAFF">Staff</option><option value="OWNER">Owner</option></select></div>
            <div><label className="label" htmlFor="u-pw">Password (10+ characters)</label><input id="u-pw" name="password" type="password" minLength={10} required autoComplete="new-password" className="input" /></div>
          </div>
        </ActionForm>
      </section>
      <section className="border border-line bg-white">
        <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">Recent admin activity</h2>
        <table className="tbl"><tbody>{log.map((l) => (<tr key={l.id}><td className="text-xs">{fmtDateTime(l.createdAt)}</td><td className="text-xs">{l.actor}</td><td className="text-xs">{l.action}</td><td className="text-xs text-muted">{l.entity}{l.entityId ? ` ${l.entityId.slice(0, 12)}` : ""}</td></tr>))}</tbody></table>
      </section>
    </div>
  );
}
