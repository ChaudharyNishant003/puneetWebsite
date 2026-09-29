"use client";
import { useRouter } from "next/navigation";
import { LoginForm } from "./LoginForm";

export function LoginRedirect({ next }: { next: string }) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="eyebrow mb-4 text-center text-lg">Log in or sign up</h1>
      <LoginForm onDone={() => { router.push(next); router.refresh(); }} />
    </div>
  );
}
