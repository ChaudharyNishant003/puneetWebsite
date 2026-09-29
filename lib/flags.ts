import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { db } from "./db";
import { FEATURES, type Side } from "./features";

// Missing row = ON (today's behaviour). Cached in process memory; ops console writes call
// invalidateFlags() so changes apply on the next request.

type FlagMap = Record<string, { admin: boolean; site: boolean }>;
let memo: { at: number; map: FlagMap } | null = null;
const TTL = 30_000;

async function load(): Promise<FlagMap> {
  if (memo && Date.now() - memo.at < TTL) return memo.map;
  const rows = await db.featureFlag.findMany();
  const map: FlagMap = {};
  for (const f of FEATURES) map[f.key] = { admin: true, site: true };
  for (const r of rows) if (map[r.key]) map[r.key] = { admin: r.adminOn, site: r.siteOn };
  memo = { at: Date.now(), map };
  return map;
}

export const getFlags = cache(async () => {
  const map = await load();
  return {
    admin: (k: string) => map[k]?.admin ?? true,
    site: (k: string) => map[k]?.site ?? true,
    map,
  };
});

export function invalidateFlags() {
  memo = null;
}

export async function isOn(key: string, side: Side) {
  return (await getFlags())[side](key);
}

// Pages: a switched-off feature behaves exactly like a page that never existed.
export async function requirePage(key: string, side: Side = "admin") {
  if (!(await isOn(key, side))) notFound();
}

// Server actions: refuse without revealing why.
export class Unavailable extends Error {
  constructor() {
    super("Something went wrong. Please try again.");
  }
}
export async function requireAction(key: string, side: Side = "admin") {
  if (!(await isOn(key, side))) throw new Unavailable();
}

// Only the site switches, for client components on the storefront.
export async function siteFlags(): Promise<Record<string, boolean>> {
  const { map } = await getFlags();
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.site]));
}

// ---------- Site controls (maintenance, admin user limit) ----------

export type Maintenance = { site: boolean; admin: boolean; message: string };
const DEFAULT_MAINTENANCE: Maintenance = { site: false, admin: false, message: "We're making some improvements. We'll be back soon." };

let ctlMemo: { at: number; maintenance: Maintenance; userLimit: number | null } | null = null;

export async function getControls() {
  if (ctlMemo && Date.now() - ctlMemo.at < TTL) return ctlMemo;
  const rows = await db.siteControl.findMany();
  const get = (k: string) => rows.find((r) => r.key === k)?.value;
  const m = get("maintenance") as Partial<Maintenance> | undefined;
  const lim = get("userLimit");
  ctlMemo = { at: Date.now(), maintenance: { ...DEFAULT_MAINTENANCE, ...(m ?? {}) }, userLimit: typeof lim === "number" ? lim : null };
  return ctlMemo;
}

export function invalidateControls() {
  ctlMemo = null;
}
