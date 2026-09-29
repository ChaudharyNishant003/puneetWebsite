import type { Metadata } from "next";
import { opsEnabled } from "@/lib/auth/ops";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Console", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  if (!opsEnabled()) notFound();
  return <div className="min-h-screen bg-[#0f1720] text-[#e6edf3]">{children}</div>;
}
