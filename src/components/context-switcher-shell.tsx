import { Suspense } from "react";
import { ContextSwitcher } from "@/components/context-switcher";

function Fallback() {
  return <div className="h-9 w-44 rounded-full border border-[var(--line)] bg-[var(--surface)]" />;
}

export function ContextSwitcherShell() {
  return (
    <Suspense fallback={<Fallback />}>
      <ContextSwitcher />
    </Suspense>
  );
}

