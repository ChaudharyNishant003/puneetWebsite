import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { getControls, getFlags, requirePage } from "@/lib/flags";
import { opsEnabled } from "@/lib/auth/ops";
import { fmtDateTime } from "@/lib/format";
import { createAdminUserAction, setAdminUserActiveAction } from "@/app/actions/admin-config";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { ResetPassword } from "@/components/admin/ResetPassword";

export const metadata = { title: "Users" };

// Plain-words labels so the owner can read what happened, including developer actions.
const ACTIVITY: Record<string, string> = {
  "plan.features_updated": "Developer updated the features in your plan",
  "plan.user_limit_updated": "Developer updated how many users your plan allows",
  "site.maintenance_on": "Developer put the site in maintenance",
  "site.maintenance_off": "Developer ended maintenance",
  "user.disabled_by_developer": "Developer disabled a user account",
  "user.enabled_by_developer": "Developer enabled a user account",
  "user.password_reset_by_developer": "Developer reset a user's password",
  "developer.viewed_admin_as_owner": "Developer opened the admin panel as the owner (support view)",
  "developer.viewed_admin_as_staff": "Developer opened the admin panel as a staff user (support view)",
};

export default async function Users() {
  const me = await requireAdmin("OWNER");
  await requirePage("users");
  const [users, log, flags, controls, devs] = await Promise.all([
    db.adminUser.findMany({ orderBy: { createdAt: "asc" } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
    getFlags(),
    getControls(),
    opsEnabled() ? db.opsUser.findMany({ select: { email: true, lastLoginAt: true } }) : Promise.resolve([]),
  ]);
  const atLimit = controls.userLimit !== null && users.length - 1 >= controls.userLimit;

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-xl font-semibold">Users</h1>
      <div className="overflow-x-auto border border-line bg-white">
        <table className="tbl">
          <thead><tr><th>Name</th><th>Role</th><th>Last login</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.active && !u.lockedByOps ? "" : "opacity-50"}>
                <td>{u.name}<br /><span className="text-xs text-muted">{u.email}</span>{u.lockedByOps ? <span className="block text-xs text-danger">Disabled by developer</span> : null}</td>
                <td className="text-xs">{u.role === "OWNER" ? "Owner" : "Staff"}</td>
                <td className="text-xs">{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : "Never"}</td>
                <td className="space-x-3 whitespace-nowrap">
                  <ResetPassword id={u.id} />
                  {u.id !== me.id ? <ActionButton action={setAdminUserActiveAction.bind(null, u.id, !u.active)} className="text-xs underline">{u.active ? "Deactivate" : "Activate"}</ActionButton> : null}
                </td>
              </tr>
            ))}
            {devs.map((d) => (
              <tr key={d.email} className="bg-surface">
                <td>Developer (support)<br /><span className="text-xs text-muted">{d.email}</span></td>
                <td className="text-xs">Developer</td>
                <td className="text-xs">{d.lastLoginAt ? fmtDateTime(d.lastLoginAt) : "Never"}</td>
                <td className="text-xs text-muted">Manages your plan and support access</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {devs.length ? <p className="-mt-3 text-xs text-muted">Your plan&apos;s features, user limit and maintenance are managed by the developer during the testing phase. Their actions appear in the activity list below.</p> : null}
      {atLimit ? (
        <p className="border border-line bg-white p-4 text-sm text-muted">Your plan allows {controls.userLimit} extra user{controls.userLimit === 1 ? "" : "s"}. Contact the developer to add more.</p>
      ) : (
        <section className="border border-line bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold">Add a user</h2>
          <p className="mb-3 text-xs text-muted">Staff can manage products, stock, orders, exchanges, reviews, coupons and pincodes. Only owners see settings, reports and users.</p>
          <ActionForm action={createAdminUserAction} submit="Add user" reset>
            <div className="grid gap-3 md:grid-cols-2">
              <div><label className="label" htmlFor="u-name">Name</label><input id="u-name" name="name" required className="input" /></div>
              <div><label className="label" htmlFor="u-email">Email</label><input id="u-email" name="email" type="email" required className="input" /></div>
              <div>
                <label className="label" htmlFor="u-role">Role</label>
                <select id="u-role" name="role" className="input">
                  <option value="STAFF">Staff</option>
                  <option value="OWNER">Owner</option>
                  <option value="DEVELOPER" disabled>Developer (managed by the developer)</option>
                </select>
              </div>
              <div><label className="label" htmlFor="u-pw">Password (10+ characters)</label><input id="u-pw" name="password" type="password" minLength={10} required autoComplete="new-password" className="input" /></div>
            </div>
          </ActionForm>
        </section>
      )}
      {flags.admin("activityLog") ? (
        <section className="border border-line bg-white">
          <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">Recent admin activity</h2>
          <table className="tbl">
            <tbody>
              {log.map((l) => (
                <tr key={l.id} className={l.actor === "developer" ? "bg-surface" : ""}>
                  <td className="text-xs">{fmtDateTime(l.createdAt)}</td>
                  <td className="text-xs">{l.actor === "developer" ? "Developer" : l.actor}</td>
                  <td className="text-xs">{ACTIVITY[l.action] ?? l.action}</td>
                  <td className="text-xs text-muted">{ACTIVITY[l.action] ? "" : `${l.entity}${l.entityId ? ` ${l.entityId.slice(0, 12)}` : ""}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
