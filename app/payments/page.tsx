import Link from "next/link";
import { ContextSwitcherShell } from "@/components/context-switcher-shell";
import { formatAmount, formatDate } from "@/lib/presenters";
import { requireOnboardedUserId } from "@/server/auth";
import { resolveAccessScopeForUser, resolveContextFromSearchParams, type SearchParamsLike } from "@/server/context";
import { listPayments, type PaymentListFilter } from "@/server/services/payments";
import { stopPaymentAction } from "./actions";

export const dynamic = "force-dynamic";

function typeBadge(type: string): string {
  if (type === "subscription") {
    return "bg-[#e8efff] text-[#1f4ec9]";
  }

  return "bg-[#fff4db] text-[#9a6a00]";
}

function resolveFilter(searchParams: SearchParamsLike): PaymentListFilter {
  const raw = searchParams.filter;
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (value === "subscription" || value === "bill" || value === "stopped") {
    return value;
  }

  return "all";
}

const FILTERS: Array<{ value: PaymentListFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "subscription", label: "Subscriptions" },
  { value: "bill", label: "Bills" },
  { value: "stopped", label: "Stopped" },
];

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsLike>;
}) {
  const userId = await requireOnboardedUserId();
  const resolvedSearchParams = await searchParams;
  const requestedContext = resolveContextFromSearchParams(resolvedSearchParams);
  const scope = await resolveAccessScopeForUser(userId, requestedContext, { fallbackToPersonal: true });
  const filter = resolveFilter(resolvedSearchParams);
  const payments = await listPayments(scope, filter);
  const isStoppedView = filter === "stopped";

  return (
    <section className="page-stack space-y-4">
      <div className="soft-card overflow-hidden">
        <div className="border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Context</div>
              <h1 className="text-xl font-bold text-[var(--ink)]">Payments</h1>
            </div>
            <ContextSwitcherShell />
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-sm text-[var(--muted)]">
            {payments.length} {isStoppedView ? "stopped" : "active"} {payments.length === 1 ? "payment" : "payments"}
          </div>
          <Link
            href={`/payments/add?context=${scope.context}`}
            className="btn-primary"
          >
            Add Payment
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-[var(--line)] px-4 py-3">
          {FILTERS.map((item) => {
            const isActive = filter === item.value;
            return (
              <Link
                key={item.value}
                href={`/payments?context=${scope.context}&filter=${item.value}`}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
                  isActive
                    ? "bg-[var(--brand)] text-white"
                    : "border border-[var(--line)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="soft-card p-4">
        {payments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-5 text-center">
            <div className="text-sm font-semibold text-[var(--ink)]">No payments in this filter</div>
            <div className="mt-1 text-sm text-[var(--muted)]">
              {isStoppedView
                ? "Stopped payments will appear here."
                : "Add your first recurring bill or subscription to start tracking."}
            </div>
            {!isStoppedView ? (
              <Link
                href={`/payments/add?context=${scope.context}`}
                className="btn-secondary mt-3 inline-block"
              >
                Create first payment
              </Link>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-2">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="list-item p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/payments/${payment.id}?context=${scope.context}`}
                        className="truncate text-base font-semibold text-[var(--ink)] hover:text-[var(--brand)]"
                      >
                        {payment.title}
                      </Link>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                          isStoppedView ? "bg-[#f6e8e8] text-[#ab2f2f]" : typeBadge(payment.paymentType)
                        }`}
                      >
                        {isStoppedView ? "stopped" : payment.paymentType}
                      </span>
                    </div>

                    <div className="mt-1 text-sm text-[var(--muted)]">
                      Every {payment.recurrenceInterval} {payment.recurrenceUnit}
                    </div>
                    <div className="text-sm text-[var(--muted)]">Due {formatDate(payment.nextDueDate)}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-bold text-[var(--ink)]">
                      {formatAmount(payment.amountMinor, payment.currency)}
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                      {payment.currency}
                    </div>
                    {!isStoppedView ? (
                      <form action={stopPaymentAction} className="mt-2">
                        <input type="hidden" name="context" value={scope.context} />
                        <input type="hidden" name="paymentId" value={payment.id} />
                        <input type="hidden" name="filter" value={filter} />
                        <button
                          type="submit"
                          className="btn-danger-subtle"
                        >
                          Stop
                        </button>
                      </form>
                    ) : null}
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

