import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/auth/session";
import { LoginRedirect } from "@/components/shop/LoginRedirect";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  if (await getCustomerSession()) redirect(safeNext);
  return <LoginRedirect next={safeNext} />;
}
