"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, useTransition } from "react";

function resolveSignInError(code: string | null | undefined): string {
  if (!code || code === "CredentialsSignin") {
    return "Invalid email or password.";
  }

  if (code === "AccessDenied") {
    return "Access denied for this account.";
  }

  return "Unable to sign in right now. Please try again.";
}

export function SignInForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("demo@billora.app");
  const [password, setPassword] = useState("DemoPass123!");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: false,
      });

      if (!result || result.error) {
        setError(resolveSignInError(result?.error));
        return;
      }

      router.push((result.url ?? callbackUrl) as Route);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="grid gap-1 text-sm">
        <span className="font-semibold text-[var(--ink)]">Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="field-input"
          autoComplete="email"
        />
      </label>

      <label className="grid gap-1 text-sm">
        <span className="font-semibold text-[var(--ink)]">Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="field-input"
          autoComplete="current-password"
        />
      </label>

      {error ? <p className="text-sm font-semibold text-[#ab2f2f]">{error}</p> : null}

      <button type="submit" className="btn-primary w-full" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

