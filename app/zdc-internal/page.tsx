import { db } from "@/lib/db";
import { opsBase, requireOps } from "@/lib/auth/ops";
import { getControls, getFlags } from "@/lib/flags";
import { FEATURE_GROUPS, FEATURES, switchCount } from "@/lib/features";
import { opsLogoutAction } from "@/app/actions/ops";
import { OpsLogin } from "@/components/ops/OpsLogin";
import { OpsConsole } from "@/components/ops/OpsConsole";

export default async function OpsHome() {
  const me = await requireOps();
  if (!me) return <OpsLogin />;

  const [{ map }, controls, admins, log] = await Promise.all([
    getFlags(),
    getControls(),
    db.adminUser.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, active: true, lockedByOps: true, lastLoginAt: true, createdAt: true } }),
    db.opsLog.findMany({ orderBy: { createdAt: "desc" }, take: 60 }),
  ]);
  const off = FEATURES.reduce((n, f) => n + (f.admin && !map[f.key].admin ? 1 : 0) + (f.site && !map[f.key].site ? 1 : 0), 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Control Console</h1>
          <p className="text-xs text-[#8b98a5]">{me.email} · {switchCount - off}/{switchCount} switches ON{controls.maintenance.site ? " · SITE IN MAINTENANCE" : ""}</p>
        </div>
        <div className="flex gap-2 text-xs">
          <a href="/" target="_blank" className="rounded border border-[#2d3b4a] px-3 py-1.5">Open website ↗</a>
          <form action={opsLogoutAction}><button className="rounded border border-[#2d3b4a] px-3 py-1.5">Sign out</button></form>
        </div>
      </div>
      <OpsConsole
        base={opsBase()}
        groups={[...FEATURE_GROUPS]}
        features={FEATURES}
        flags={map}
        maintenance={controls.maintenance}
        userLimit={controls.userLimit}
        admins={admins.map((a) => ({ ...a, lastLoginAt: a.lastLoginAt?.toISOString() ?? null, createdAt: a.createdAt.toISOString() }))}
        log={log.map((l) => ({ id: l.id, action: l.action, detail: l.detail ? JSON.stringify(l.detail) : "", at: l.createdAt.toISOString() }))}
      />
    </div>
  );
}
