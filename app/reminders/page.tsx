import type { Route } from "next";
import Link from "next/link";
import { ContextSwitcherShell } from "@/components/context-switcher-shell";
import { formatDate } from "@/lib/presenters";
import { requireOnboardedUserId } from "@/server/auth";
import { resolveAccessScopeForUser, resolveContextFromSearchParams, type SearchParamsLike } from "@/server/context";
import { getInAppReminders } from "@/server/services/reminders";
import {
  markAllRemindersReadAction,
  markReminderReadAction,
  markReminderUnreadAction,
} from "./actions";

export const dynamic = "force-dynamic";

function resolveFilter(searchParams: SearchParamsLike): "all" | "unread" {
  const raw = searchParams.filter;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "unread" ? "unread" : "all";
}

function reminderLabel(offsetDays: number): string {
  if (offsetDays <= 0) {
    return "Due today";
  }

  return `${offsetDays} day${offsetDays === 1 ? "" : "s"} before due`;
}

export default async function RemindersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsLike>;
}) {
  const userId = await requireOnboardedUserId();
  const resolved = await searchParams;
  const requestedContext = resolveContextFromSearchParams(resolved);
  const scope = await resolveAccessScopeForUser(userId, requestedContext, { fallbackToPersonal: true });
  const filter = resolveFilter(resolved);

  const reminders = await getInAppReminders(userId, {
    context: scope.context,
    unreadOnly: filter === "unread",
    limit: 100,
  });

  const unreadCount = reminders.filter((item) => !item.isRead).length;

  return (
    <section className="page-stack space-y-4">
      <div className="soft-card overflow-hidden">
        <div className="border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Center</div>
              <h1 className="text-xl font-bold text-[var(--ink)]">Reminders</h1>
            </div>
            <ContextSwitcherShell />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="text-sm text-[var(--muted)]">
            {unreadCount} unread {unreadCount === 1 ? "reminder" : "reminders"}
          </div>
          <form action={markAllRemindersReadAction}>
            <input type="hidden" name="context" value={scope.context} />
            <input type="hidden" name="filter" value={filter} />
            <button type="submit" className="btn-secondary">
              Mark all as read
            </button>
          </form>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-[var(--line)] px-4 py-3">
          <Link
            href={`/reminders?context=${scope.context}&filter=all` as Route}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
              filter === "all"
                ? "bg-[var(--brand)] text-white"
                : "border border-[var(--line)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            All
          </Link>
          <Link
            href={`/reminders?context=${scope.context}&filter=unread` as Route}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
              filter === "unread"
                ? "bg-[var(--brand)] text-white"
                : "border border-[var(--line)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            Unread
          </Link>
        </div>
      </div>

      <div className="soft-card p-4">
        {reminders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
            No reminders in this view.
          </div>
        ) : (
          <ul className="space-y-2">
            {reminders.map((reminder) => (
              <li key={reminder.id} className="list-item px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-[var(--ink)]">{reminder.title}</div>
                    <div className="text-xs text-[var(--muted)]">Due {formatDate(new Date(reminder.targetDueDate))}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--muted)]">
                      {reminderLabel(reminder.reminderOffsetDays)}
                    </div>
                    <div
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                        reminder.isRead
                          ? "bg-[var(--surface)] text-[var(--muted)]"
                          : "bg-[var(--brand-soft)] text-[var(--brand)]"
                      }`}
                    >
                      {reminder.isRead ? "read" : "unread"}
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex justify-end">
                  {reminder.isRead ? (
                    <form action={markReminderUnreadAction}>
                      <input type="hidden" name="reminderId" value={reminder.id} />
                      <input type="hidden" name="context" value={scope.context} />
                      <input type="hidden" name="filter" value={filter} />
                      <button type="submit" className="btn-secondary">
                        Mark unread
                      </button>
                    </form>
                  ) : (
                    <form action={markReminderReadAction}>
                      <input type="hidden" name="reminderId" value={reminder.id} />
                      <input type="hidden" name="context" value={scope.context} />
                      <input type="hidden" name="filter" value={filter} />
                      <button type="submit" className="btn-secondary">
                        Mark read
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

