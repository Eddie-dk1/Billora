import Link from "next/link";
import { notFound } from "next/navigation";
import { ContextSwitcherShell } from "@/components/context-switcher-shell";
import { MarkPaidForm } from "@/components/mark-paid-form";
import { RecurrenceFields } from "@/components/recurrence-fields";
import { formatAmount, formatDate } from "@/lib/presenters";
import { requireOnboardedUserId } from "@/server/auth";
import { resolveAccessScopeForUser, resolveContextFromSearchParams, type SearchParamsLike } from "@/server/context";
import { listCategories } from "@/server/services/categories";
import { formatMinorToAmount, getPaymentById } from "@/server/services/payments";
import { markPaymentPaidAction, stopPaymentAction, updatePaymentAction } from "../actions";

export const dynamic = "force-dynamic";

const REMINDER_OFFSET_OPTIONS = [
  { value: 0, label: "Due day" },
  { value: 1, label: "1 day before" },
  { value: 3, label: "3 days before" },
  { value: 7, label: "7 days before" },
] as const;

function typeBadge(type: string): string {
  if (type === "subscription") {
    return "bg-[#e8efff] text-[#1f4ec9]";
  }

  return "bg-[#fff4db] text-[#9a6a00]";
}

export default async function PaymentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParamsLike>;
}) {
  const userId = await requireOnboardedUserId();
  const { id } = await params;
  const requestedContext = resolveContextFromSearchParams(await searchParams);
  const scope = await resolveAccessScopeForUser(userId, requestedContext, { fallbackToPersonal: true });
  const payment = await getPaymentById(scope, id);

  if (!payment) {
    notFound();
  }

  const categories = await listCategories(scope);
  const isStopped = payment.status === "stopped";
  const activeOffsets = new Set(payment.reminders.map((item) => item.offsetDays));

  return (
    <section className="page-stack space-y-4">
      <div className="soft-card overflow-hidden">
        <div className="border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Payment Details</div>
              <h1 className="text-xl font-bold text-[var(--ink)]">{payment.title}</h1>
            </div>
            <ContextSwitcherShell />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                isStopped ? "bg-[#f6e8e8] text-[#ab2f2f]" : typeBadge(payment.paymentType)
              }`}
            >
              {isStopped ? "stopped" : payment.paymentType}
            </span>
            {payment.category ? (
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                style={{ backgroundColor: `${payment.category.color}22`, color: payment.category.color }}
              >
                {payment.category.name}
              </span>
            ) : null}
            <span className="text-sm text-[var(--muted)]">Due {formatDate(payment.nextDueDate)}</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-[var(--ink)]">{formatAmount(payment.amountMinor, payment.currency)}</div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{payment.currency}</div>
          </div>
        </div>
      </div>

      {!isStopped ? (
        <form action={stopPaymentAction} className="soft-card p-4">
          <input type="hidden" name="context" value={scope.context} />
          <input type="hidden" name="paymentId" value={payment.id} />
          <input type="hidden" name="filter" value="all" />
          <button type="submit" className="btn-danger-subtle">
            Stop payment
          </button>
        </form>
      ) : null}

      <form action={updatePaymentAction} className="soft-card space-y-4 p-4">
        <input type="hidden" name="paymentId" value={payment.id} />
        <input type="hidden" name="context" value={scope.context} />

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--ink)]">Edit payment</h2>
          <Link href={`/payments?context=${scope.context}`} className="btn-secondary">
            Back to list
          </Link>
        </div>

        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-[var(--ink)]">Title</span>
          <input name="title" defaultValue={payment.title} required className="field-input" />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-semibold text-[var(--ink)]">Type</span>
            <select name="paymentType" defaultValue={payment.paymentType} className="field-select">
              <option value="subscription">Subscription</option>
              <option value="bill">Bill</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-semibold text-[var(--ink)]">Amount</span>
            <input
              name="amount"
              defaultValue={formatMinorToAmount(payment.amountMinor)}
              required
              className="field-input"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-semibold text-[var(--ink)]">Currency</span>
            <input name="currency" defaultValue={payment.currency} className="field-input" />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-semibold text-[var(--ink)]">Category</span>
            <select name="categoryId" defaultValue={payment.categoryId ?? ""} className="field-select">
              <option value="">Uncategorized</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-[var(--ink)]">Next due date</span>
          <input
            type="date"
            name="nextDueDate"
            defaultValue={payment.nextDueDate.toISOString().slice(0, 10)}
            required
            className="field-input"
          />
        </label>

        <RecurrenceFields
          initialInterval={payment.recurrenceInterval}
          initialUnit={payment.recurrenceUnit as "day" | "week" | "month" | "year"}
        />

        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
          <div className="text-sm font-semibold text-[var(--ink)]">Reminder offsets</div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {REMINDER_OFFSET_OPTIONS.map((option) => (
              <label key={option.value} className="list-item flex cursor-pointer items-center justify-between px-3 py-2 text-sm">
                <span>{option.label}</span>
                <input
                  type="checkbox"
                  name="reminderOffsets"
                  value={String(option.value)}
                  defaultChecked={activeOffsets.has(option.value)}
                  className="h-4 w-4"
                />
              </label>
            ))}
          </div>
          <div className="mt-2 text-xs text-[var(--muted)]">Supported offsets: 0 / 1 / 3 / 7 days.</div>
        </div>

        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-[var(--ink)]">Note</span>
          <textarea name="note" defaultValue={payment.note ?? ""} rows={3} className="field-textarea" />
        </label>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary">
            Save changes
          </button>
        </div>
      </form>

      {!isStopped ? (
        <MarkPaidForm
          action={markPaymentPaidAction}
          context={scope.context}
          paymentId={payment.id}
          dueDateIso={payment.nextDueDate.toISOString().slice(0, 10)}
          amountPlaceholder={formatMinorToAmount(payment.amountMinor)}
          currencyPlaceholder={payment.currency}
        />
      ) : (
        <div className="soft-card rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
          Payment is stopped. Mark-as-paid is disabled for stopped payments in MVP.
        </div>
      )}

      <div className="soft-card p-4">
        <h2 className="mb-3 text-lg font-bold text-[var(--ink)]">History (immutable)</h2>
        {payment.history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
            No payments recorded yet.
          </div>
        ) : (
          <ul className="space-y-2 text-sm">
            {payment.history.map((entry) => (
              <li key={entry.id} className="list-item p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-[var(--ink)]">{formatDate(entry.paidAt)}</div>
                  <div className="font-bold text-[var(--ink)]">{formatAmount(entry.paidAmountMinor, entry.currency)}</div>
                </div>
                <div className="mt-1 inline-block rounded-full bg-[var(--surface)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {entry.scheduleAction}
                </div>
                {entry.note ? <div className="mt-1 text-xs text-[var(--muted)]">{entry.note}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
