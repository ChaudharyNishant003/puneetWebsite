"use client";
import { createContext, useContext } from "react";

// Website-side feature switches for client components (missing key = ON).
const Ctx = createContext<Record<string, boolean>>({});

export function SiteFlagsProvider({ flags, children }: { flags: Record<string, boolean>; children: React.ReactNode }) {
  return <Ctx.Provider value={flags}>{children}</Ctx.Provider>;
}

export function useSite(key: string) {
  return useContext(Ctx)[key] ?? true;
}
