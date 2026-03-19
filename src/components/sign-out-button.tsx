"use client";

import { useTransition } from "react";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      await signOut({ callbackUrl: "/auth/sign-in?reason=signed_out" });
    });
  }

  return (
    <button type="button" className="btn-secondary" onClick={onClick} disabled={isPending}>
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
