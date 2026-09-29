"use client";
import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FeatureDef } from "@/lib/features";
import type { Maintenance } from "@/lib/flags";
import { opsChangePasswordAction, resetAdminPasswordOpsAction, setAdminLockAction, setAllFlagsAction, setFlagAction, setMaintenanceAction, setUserLimitAction, viewAsAction } from "@/app/actions/ops";

type Admin = { id: string; name: string; email: string; role: "OWNER" | "STAFF"; active: boolean; lockedByOps: boolean; lastLoginAt: string | null; createdAt: string };
type Props = {
  base: string;
  groups: string[];
  features: FeatureDef[];
  flags: Record<string, { admin: boolean; site: boolean }>;
  maintenance: Maintenance;
  userLimit: number | null;
  admins: Admin[];
  log: { id: string; action: string; detail: string; at: string }[];
};

const card = "rounded-lg border border-[#2d3b4a] bg-[#131c26] p-4";
const btn = "rounded border border-[#2d3b4a] px-3 py-1.5 text-xs hover:bg-[#1b2633] disabled:opacity-50";
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "never");

function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${on ? "bg-[#2e9e5b]" : "bg-[#3a4654]"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export function OpsConsole(p: Props) {
  const [tab, setTab] = useState<"features" | "accounts" | "site" | "activity" | "security">("features");
  const [flags, setFlags] = useState(p.flags);
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const toggle = (f: FeatureDef, side: "admin" | "site", on: boolean) => {
    if (!on && f.core && !confirm(`"${f.label}" is core — the shop can't really operate without it. Turn OFF anyway?`)) return;
    setFlags((x) => ({ ...x, [f.key]: { ...x[f.key], [side]: on } }));
    start(async () => {
      const r = await setFlagAction(f.key, side, on);
      if (!r.ok) {
        setFlags((x) => ({ ...x, [f.key]: { ...x[f.key], [side]: !on } }));
        setMsg("Could not save");
      }
    });
  };

  const bulk = (mode: "on" | "off" | "default") => {
    if (!confirm(mode === "off" ? "Turn OFF every non-core feature?" : "Reset every switch to ON (default)?")) return;
    start(async () => {
      await setAllFlagsAction(mode);
      router.refresh();
      location.reload();
    });
  };

  const shown = useMemo(() => p.features.filter((f) => !q || `${f.label} ${f.admin ?? ""} ${f.site ?? ""}`.toLowerCase().includes(q.toLowerCase())), [p.features, q]);

  return (
    <div>
      <div className="mb-4 flex gap-1 overflow-x-auto text-sm">
        {(["features", "accounts", "site", "activity", "security"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`shrink-0 rounded px-3 py-1.5 capitalize ${tab === t ? "bg-[#2f6fb0] text-white" : "bg-[#131c26]"}`}>{t}</button>
        ))}
      </div>
      {msg ? <p className="mb-3 text-sm text-[#f08b83]">{msg}</p> : null}

      {tab === "features" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search features…" aria-label="Search features" className="w-60 rounded border border-[#2d3b4a] bg-[#0b1118] px-3 py-1.5 text-sm" />
            <button className={btn} disabled={pending} onClick={() => bulk("default")}>All ON (default)</button>
            <button className={btn} disabled={pending} onClick={() => bulk("off")}>All OFF (except core)</button>
            <span className="text-xs text-[#8b98a5]">Changes apply on the next page load. Nothing is deleted when a feature is OFF. Testing phase only — this console is disabled on a production (non-demo) deploy.</span>
          </div>
          {p.groups.map((g) => {
            const list = shown.filter((f) => f.group === g);
            if (!list.length) return null;
            return (
              <section key={g} className={card}>
                <h2 className="mb-2 text-sm font-semibold text-[#8fb6ee]">{g}</h2>
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-3 text-sm">
                  <span className="text-[11px] uppercase tracking-wider text-[#8b98a5]">Feature</span>
                  <span className="text-center text-[11px] uppercase tracking-wider text-[#8b98a5]">Admin</span>
                  <span className="text-center text-[11px] uppercase tracking-wider text-[#8b98a5]">Website</span>
                  {list.map((f) => (
                    <div key={f.key} className="contents">
                      <div className="min-w-0">
                        <p className="font-medium">{f.label}{f.core ? <span className="ml-2 rounded bg-[#2b2416] px-1.5 text-[10px] text-[#e8b75a]">CORE</span> : null}</p>
                        <p className="text-xs text-[#8b98a5]">{f.admin ? <>Admin: {f.admin}</> : null}{f.admin && f.site ? <br /> : null}{f.site ? <>Website: {f.site}</> : null}</p>
                      </div>
                      <div className="flex justify-center">{f.admin ? <Switch on={flags[f.key].admin} onChange={(v) => toggle(f, "admin", v)} label={`${f.label} admin`} /> : <span className="text-[#3a4654]">—</span>}</div>
                      <div className="flex justify-center">{f.site ? <Switch on={flags[f.key].site} onChange={(v) => toggle(f, "site", v)} label={`${f.label} website`} /> : <span className="text-[#3a4654]">—</span>}</div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}

      {tab === "accounts" ? <Accounts admins={p.admins} userLimit={p.userLimit} /> : null}
      {tab === "site" ? <Site maintenance={p.maintenance} /> : null}
      {tab === "activity" ? (
        <section className={card}>
          <h2 className="mb-2 text-sm font-semibold text-[#8fb6ee]">Your changes (detailed). The owner sees a plain-words summary in Admin → Users → activity.</h2>
          <table className="w-full text-xs">
            <tbody>{p.log.map((l) => (<tr key={l.id} className="border-b border-[#1f2a36]"><td className="py-1.5 pr-3 text-[#8b98a5]">{when(l.at)}</td><td className="pr-3 font-medium">{l.action}</td><td className="break-all text-[#8b98a5]">{l.detail}</td></tr>))}</tbody>
          </table>
        </section>
      ) : null}
      {tab === "security" ? <Security /> : null}
    </div>
  );
}

function Accounts({ admins, userLimit }: { admins: Admin[]; userLimit: number | null }) {
  const [pending, start] = useTransition();
  const [limit, setLimit] = useState(userLimit === null ? "" : String(userLimit));
  const [msg, setMsg] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error: string | null }>, ok = "Saved") =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? ok : r.error);
      if (r.ok) setTimeout(() => location.reload(), 400);
    });
  const others = admins.length - 1;

  return (
    <div className="space-y-4">
      <section className={card}>
        <h2 className="mb-3 text-sm font-semibold text-[#8fb6ee]">Admin accounts</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#8b98a5]"><th className="pb-2">User</th><th>Role</th><th>Status</th><th>Last login</th><th></th></tr></thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className="border-t border-[#1f2a36]">
                  <td className="py-2">{a.name}<br /><span className="text-xs text-[#8b98a5]">{a.email}</span></td>
                  <td className="text-xs">{a.role}</td>
                  <td className="text-xs">{a.lockedByOps ? <span className="text-[#f08b83]">Disabled (by you)</span> : a.active ? <span className="text-[#6ccb8a]">Active</span> : <span className="text-[#8b98a5]">Deactivated by owner</span>}</td>
                  <td className="text-xs text-[#8b98a5]">{when(a.lastLoginAt)}</td>
                  <td className="space-x-1 whitespace-nowrap text-right">
                    <button className={btn} disabled={pending} onClick={() => start(async () => { await viewAsAction(a.id); })}>View as</button>
                    <button className={btn} disabled={pending} onClick={() => { if (confirm(a.lockedByOps ? `Enable ${a.email}?` : `Disable ${a.email}? They will be signed out now.`)) run(() => setAdminLockAction(a.id, !a.lockedByOps)); }}>{a.lockedByOps ? "Enable" : "Disable"}</button>
                    <button className={btn} disabled={pending} onClick={() => { const pw = prompt(`New password for ${a.email} (10+ characters):`); if (pw) run(() => resetAdminPasswordOpsAction(a.id, pw), "Password changed — they are signed out"); }}>Reset password</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-[#8b98a5]">"View as" opens the admin panel as that user in this browser (support view). The owner sees "Developer opened the admin panel" in their activity list, and anything you change there is recorded as Developer.</p>
      </section>
      <section className={card}>
        <h2 className="mb-2 text-sm font-semibold text-[#8fb6ee]">Extra admin users allowed</h2>
        <p className="mb-2 text-xs text-[#8b98a5]">How many users the owner may have besides the first owner account (staff or extra owners). Empty = no limit. Currently {others} extra. At the limit, the owner sees "Contact the developer to add more".</p>
        <div className="flex gap-2">
          <input value={limit} onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="No limit" aria-label="Extra users allowed" className="w-28 rounded border border-[#2d3b4a] bg-[#0b1118] px-3 py-1.5 text-sm" />
          <button className={btn} disabled={pending} onClick={() => run(() => setUserLimitAction(limit === "" ? null : Number(limit)))}>Save</button>
        </div>
      </section>
      {msg ? <p className="text-sm text-[#8fb6ee]">{msg}</p> : null}
    </div>
  );
}

function Site({ maintenance }: { maintenance: Maintenance }) {
  const [m, setM] = useState(maintenance);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <section className={`${card} max-w-2xl space-y-4`}>
      <h2 className="text-sm font-semibold text-[#8fb6ee]">Maintenance</h2>
      <label className="flex items-center justify-between gap-4 text-sm">
        <span>Website in maintenance<br /><span className="text-xs text-[#8b98a5]">Customers see only the message below; ordering stops.</span></span>
        <Switch on={m.site} onChange={(v) => setM({ ...m, site: v })} label="Website maintenance" />
      </label>
      <label className="flex items-center justify-between gap-4 text-sm">
        <span>Admin panel in maintenance<br /><span className="text-xs text-[#8b98a5]">Owner and staff see &quot;Admin is under maintenance&quot;.</span></span>
        <Switch on={m.admin} onChange={(v) => setM({ ...m, admin: v })} label="Admin maintenance" />
      </label>
      <div>
        <label className="mb-1 block text-xs text-[#8b98a5]" htmlFor="mm">Message</label>
        <textarea id="mm" value={m.message} onChange={(e) => setM({ ...m, message: e.target.value })} rows={2} className="w-full rounded border border-[#2d3b4a] bg-[#0b1118] px-3 py-2 text-sm" />
      </div>
      <button className={btn} disabled={pending} onClick={() => start(async () => { const r = await setMaintenanceAction(m); setMsg(r.ok ? "Saved" : r.error); })}>Save</button>
      {msg ? <p className="text-sm text-[#8fb6ee]">{msg}</p> : null}
    </section>
  );
}

function Security() {
  const [state, action, pending] = useActionState(opsChangePasswordAction, null);
  return (
    <section className={`${card} max-w-md`}>
      <h2 className="mb-3 text-sm font-semibold text-[#8fb6ee]">Change your password</h2>
      <form action={action} className="space-y-2">
        <input name="current" type="password" required autoComplete="current-password" placeholder="Current password" aria-label="Current password" className="w-full rounded border border-[#2d3b4a] bg-[#0b1118] px-3 py-2 text-sm" />
        <input name="next" type="password" required minLength={14} autoComplete="new-password" placeholder="New password (14+ characters)" aria-label="New password" className="w-full rounded border border-[#2d3b4a] bg-[#0b1118] px-3 py-2 text-sm" />
        {state?.error ? <p className="text-sm text-[#f08b83]">{state.error}</p> : state?.ok ? <p className="text-sm text-[#6ccb8a]">Password changed</p> : null}
        <button disabled={pending} className={btn}>Change</button>
      </form>
      <p className="mt-3 text-xs text-[#8b98a5]">Console address and first sign-in come from the server settings OPS_CONSOLE_PATH, OPS_EMAIL and OPS_PASSWORD.</p>
    </section>
  );
}
