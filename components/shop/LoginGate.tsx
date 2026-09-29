"use client";
import { useRouter } from "next/navigation";
import { LoginForm } from "./LoginForm";

export function LoginGate({ title = "Log in" }: { title?: string }) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="eyebrow mb-4 text-center text-lg">{title}</h1>
      <LoginForm onDone={() => router.refresh()} />
    </div>
  );
}
