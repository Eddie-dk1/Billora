"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function ContextSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const context = searchParams.get("context") === "shared" ? "shared" : "personal";

  function onSelect(nextContext: "personal" | "shared") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("context", nextContext);
    const target = `${pathname}?${params.toString()}` as Route;
    router.push(target);
  }

  return (
    <div className="inline-flex rounded-full border border-[var(--line)] bg-[var(--surface)] p-1 text-sm shadow-sm">
      <button
        type="button"
        onClick={() => onSelect("personal")}
        className={`rounded-full px-3 py-1.5 transition-all duration-200 ${
          context === "personal"
            ? "bg-[var(--brand)] font-semibold text-white"
            : "font-medium text-[var(--muted)]"
        }`}
      >
        Personal
      </button>
      <button
        type="button"
        onClick={() => onSelect("shared")}
        className={`rounded-full px-3 py-1.5 transition-all duration-200 ${
          context === "shared"
            ? "bg-[var(--brand)] font-semibold text-white"
            : "font-medium text-[var(--muted)]"
        }`}
      >
        Shared
      </button>
    </div>
  );
}
