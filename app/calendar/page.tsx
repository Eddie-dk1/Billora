import type { Route } from "next";
import Link from "next/link";
import { ContextSwitcherShell } from "@/components/context-switcher-shell";
import { formatAmount, formatDate } from "@/lib/presenters";
import { requireOnboardedUserId } from "@/server/auth";
import { resolveAccessScopeForUser, resolveContextFromSearchParams, type SearchParamsLike } from "@/server/context";
import { getCalendarData } from "@/server/services/payments";

export const dynamic = "force-dynamic";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseMonth(value: string | undefined): { year: number; month: number } {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    const now = new Date();
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  }

  return { year: Number(match[1]), month: Number(match[2]) };
}

function parseSelectedDate(value: string | undefined, year: number, month: number): string | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const selectedYear = Number(match[1]);
  const selectedMonth = Number(match[2]);
  if (selectedYear !== year || selectedMonth !== month) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function typeBadge(type: string): string {
  if (type === "subscription") {
    return "bg-[#e8efff] text-[#1f4ec9]";
  }

  return "bg-[#fff4db] text-[#9a6a00]";
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function weekdayIndexMonFirst(year: number, month: number, day: number): number {
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 ? 6 : weekday - 1;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsLike>;
}) {
  const userId = await requireOnboardedUserId();
  const params = await searchParams;
  const requestedContext = resolveContextFromSearchParams(params);
  const scope = await resolveAccessScopeForUser(userId, requestedContext, { fallbackToPersonal: true });
  const monthValue = Array.isArray(params.month) ? params.month[0] : params.month;
  const selectedRaw = Array.isArray(params.date) ? params.date[0] : params.date;

  const { year, month } = parseMonth(monthValue);
  const monthToken = `${year}-${String(month).padStart(2, "0")}`;

  const payments = await getCalendarData(scope, year, month);

  const paymentsByDate = new Map<string, typeof payments>();
  for (const payment of payments) {
    const key = payment.nextDueDate.toISOString().slice(0, 10);
    const list = paymentsByDate.get(key) ?? [];
    list.push(payment);
    paymentsByDate.set(key, list);
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = weekdayIndexMonFirst(year, month, 1);
  const leadingEmpty = Array.from({ length: firstWeekday }, (_, index) => `leading-${index}`);
  const trailingCount = (7 - ((firstWeekday + daysInMonth) % 7)) % 7;
  const trailingEmpty = Array.from({ length: trailingCount }, (_, index) => `trailing-${index}`);

  const selectedDate = parseSelectedDate(selectedRaw, year, month) ?? (payments[0]?.nextDueDate.toISOString().slice(0, 10) ?? null);
  const selectedPayments = selectedDate ? paymentsByDate.get(selectedDate) ?? [] : [];

  const prevMonthDate = new Date(Date.UTC(year, month - 2, 1));
  const nextMonthDate = new Date(Date.UTC(year, month, 1));
  const prevMonth = `${prevMonthDate.getUTCFullYear()}-${String(prevMonthDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const nextMonth = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, "0")}`;

  return (
    <section className="page-stack space-y-4">
      <div className="soft-card overflow-hidden">
        <div className="border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Schedule View</div>
              <h1 className="text-xl font-bold text-[var(--ink)]">Calendar</h1>
            </div>
            <ContextSwitcherShell />
          </div>
        </div>

        <form className="flex flex-wrap items-end gap-2 px-4 py-3">
          <input type="hidden" name="context" value={scope.context} />
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-[var(--ink)]">Month</span>
            <input type="month" name="month" defaultValue={monthToken} className="field-input" />
          </label>
          <button type="submit" className="btn-secondary">
            Apply
          </button>
          <Link href={`/calendar?context=${scope.context}&month=${prevMonth}` as Route} className="btn-secondary">
            Prev
          </Link>
          <Link href={`/calendar?context=${scope.context}&month=${nextMonth}` as Route} className="btn-secondary">
            Next
          </Link>
        </form>
      </div>

      <div className="soft-card p-4">
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {leadingEmpty.map((key) => (
            <div key={key} className="h-16 rounded-lg border border-transparent" />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dateKey = toIsoDate(year, month, day);
            const dueCount = paymentsByDate.get(dateKey)?.length ?? 0;
            const isSelected = selectedDate === dateKey;

            return (
              <Link
                key={dateKey}
                href={`/calendar?context=${scope.context}&month=${monthToken}&date=${dateKey}` as Route}
                className={`h-16 rounded-lg border p-1 text-left transition-colors ${
                  isSelected
                    ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                    : "border-[var(--line)] bg-[var(--card)] hover:bg-[var(--surface)]"
                }`}
              >
                <div className="text-xs font-semibold text-[var(--ink)]">{day}</div>
                {dueCount > 0 ? (
                  <div className="mt-1 inline-block rounded-full bg-[var(--brand)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {dueCount}
                  </div>
                ) : (
                  <div className="mt-2 h-1 w-1 rounded-full bg-[var(--line)]" />
                )}
              </Link>
            );
          })}

          {trailingEmpty.map((key) => (
            <div key={key} className="h-16 rounded-lg border border-transparent" />
          ))}
        </div>
      </div>

      <div className="soft-card p-4">
        <h2 className="mb-3 text-lg font-bold text-[var(--ink)]">
          {selectedDate ? `Due on ${selectedDate}` : "Due payments"}
        </h2>
        {selectedPayments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
            No due payments on selected day.
          </div>
        ) : (
          <ul className="space-y-2 text-sm">
            {selectedPayments.map((payment) => (
              <li key={payment.id} className="list-item p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-[var(--ink)]">{payment.title}</div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${typeBadge(payment.paymentType)}`}
                      >
                        {payment.paymentType}
                      </span>
                    </div>
                    <div className="text-sm text-[var(--muted)]">{formatDate(payment.nextDueDate)}</div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-[var(--ink)]">{formatAmount(payment.amountMinor, payment.currency)}</div>
                    <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">{payment.currency}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

