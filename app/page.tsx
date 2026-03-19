import type { Route } from "next";
import Link from "next/link";
import { ContextSwitcherShell } from "@/components/context-switcher-shell";
import { formatAmount, formatDate } from "@/lib/presenters";
import { requireOnboardedUserId } from "@/server/auth";
import { resolveAccessScopeForUser, resolveContextFromSearchParams, type SearchParamsLike } from "@/server/context";
import { getDashboardData } from "@/server/services/payments";
import { getInAppReminders, getUnreadInAppRemindersCount } from "@/server/services/reminders";

export const dynamic = "force-dynamic";

function statCard(label: string, value: string, tone: "brand" | "success") {
  const toneClasses =
    tone === "brand"
      ? "bg-[linear-gradient(135deg,#1f4ec9_0%,#2a66e7_100%)]"
      : "bg-[linear-gradient(135deg,#1a7a4f_0%,#24a56d_100%)]";

  return (
    <div className={`rounded-2xl p-4 text-white shadow-lg ${toneClasses}`}>
      <div className="text-xs uppercase tracking-[0.12em] text-white/80">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

function reminderLabel(offsetDays: number): string {
  if (offsetDays <= 0) {
    return "Due today";
  }

  return `${offsetDays} day${offsetDays === 1 ? "" : "s"} before due`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsLike>;
}) {
  const userId = await requireOnboardedUserId();
  const requestedContext = resolveContextFromSearchParams(await searchParams);
  const scope = await resolveAccessScopeForUser(userId, requestedContext, { fallbackToPersonal: true });

  const [data, reminders, unreadCount] = await Promise.all([
    getDashboardData(scope),
    getInAppReminders(userId, { context: scope.context, limit: 5 }),
    getUnreadInAppRemindersCount(userId, scope.context),
  ]);

  return (
    <section className="page-stack space-y-4">
      <div className="soft-card overflow-hidden">
        <div className="border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Active Context</div>
              <h1 className="text-xl font-bold text-[var(--ink)]">Dashboard</h1>
            </div>
            <ContextSwitcherShell />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
          {statCard("Due this month", formatAmount(data.dueThisMonthMinor, "USD"), "brand")}
          {statCard("Monthly load", formatAmount(data.monthlyLoadMinor, "USD"), "success")}
        </div>
      </div>

      <div className="soft-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--ink)]">Upcoming Payments</h2>
          <Link
            className="btn-secondary"
            href={`/payments?context=${scope.context}`}
          >
            View all
          </Link>
        </div>

        {data.upcoming.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
            No upcoming payments yet. Add your first payment in the Payments section.
          </div>
        ) : (
          <ul className="space-y-2">
            {data.upcoming.map((payment) => (
              <li
                key={payment.id}
                className="list-item flex items-center justify-between px-3 py-2"
              >
                <div>
                  <div className="font-semibold text-[var(--ink)]">{payment.title}</div>
                  <div className="text-xs text-[var(--muted)]">{formatDate(payment.nextDueDate)}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-[var(--ink)]">
                    {formatAmount(payment.amountMinor, payment.currency)}
                  </div>
                  <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
                    {payment.paymentType}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="soft-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--ink)]">In-app Reminders</h2>
          <Link
            className="btn-secondary"
            href={`/reminders?context=${scope.context}&filter=unread` as Route}
          >
            {unreadCount} unread
          </Link>
        </div>

        {reminders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
            No reminders yet for this context. They appear here after reminder jobs run.
          </div>
        ) : (
          <ul className="space-y-2">
            {reminders.map((reminder) => (
              <li
                key={reminder.id}
                className="list-item px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-[var(--ink)]">{reminder.title}</div>
                  <div className="text-xs text-[var(--muted)]">{formatDate(new Date(reminder.targetDueDate))}</div>
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
                  {reminderLabel(reminder.reminderOffsetDays)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

