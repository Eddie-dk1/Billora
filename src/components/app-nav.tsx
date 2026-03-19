"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/payments", label: "Payments" },
  { href: "/calendar", label: "Calendar" },
  { href: "/analytics", label: "Analytics" },
  { href: "/reminders", label: "Reminders" },
  { href: "/settings", label: "Settings" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const context = searchParams.get("context") === "shared" ? "shared" : "personal";

  if (pathname.startsWith("/auth/sign-in")) {
    return null;
  }

  return (
    <div className="space-y-2">
      <nav className="no-scrollbar flex gap-2 overflow-x-auto pb-1 text-sm">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const target = `${item.href}?context=${context}` as Route;

          return (
            <Link
              key={item.href}
              href={target}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 transition-all duration-200 ${
                active
                  ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                  : "border-[var(--line)] bg-[var(--card)] text-[var(--ink)] hover:-translate-y-0.5 hover:bg-[var(--surface)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex justify-end">
        <SignOutButton />
      </div>
    </div>
  );
}
