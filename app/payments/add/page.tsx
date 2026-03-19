import Link from "next/link";
import { ContextSwitcherShell } from "@/components/context-switcher-shell";
import { RecurrenceFields } from "@/components/recurrence-fields";
import { requireOnboardedUserId } from "@/server/auth";
import { resolveAccessScopeForUser, resolveContextFromSearchParams, type SearchParamsLike } from "@/server/context";
import { listCategories } from "@/server/services/categories";
import { createPaymentAction } from "../actions";

export const dynamic = "force-dynamic";

const REMINDER_OFFSET_OPTIONS = [
  { value: 0, label: "Due day" },
  { value: 1, label: "1 day before" },
  { value: 3, label: "3 days before" },
  { value: 7, label: "7 days before" },
] as const;

export default async function AddPaymentPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsLike>;
}) {
  const userId = await requireOnboardedUserId();
  const requestedContext = resolveContextFromSearchParams(await searchParams);
  const scope = await resolveAccessScopeForUser(userId, requestedContext, { fallbackToPersonal: true });
  const categories = await listCategories(scope);

  return (
    <section className="page-stack space-y-4">
      <div className="soft-card overflow-hidden">
        <div className="border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">New Entry</div>
              <h1 className="text-xl font-bold text-[var(--ink)]">Add Payment</h1>
            </div>
            <ContextSwitcherShell />
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm text-[var(--muted)]">Create a recurring subscription or bill.</p>
          <Link href={`/payments?context=${scope.context}`} className="btn-secondary">
            Back to list
          </Link>
        </div>
      </div>

      <form action={createPaymentAction} className="soft-card space-y-4 p-4">
        <input type="hidden" name="context" value={scope.context} />

        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-[var(--ink)]">Title</span>
          <input name="title" required className="field-input" placeholder="Netflix" />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-semibold text-[var(--ink)]">Type</span>
            <select name="paymentType" defaultValue="subscription" className="field-select">
              <option value="subscription">Subscription</option>
              <option value="bill">Bill</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-semibold text-[var(--ink)]">Amount</span>
            <input name="amount" required className="field-input" placeholder="15.99" />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-semibold text-[var(--ink)]">Currency</span>
            <input name="currency" defaultValue="USD" className="field-input" />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-semibold text-[var(--ink)]">Category</span>
            <select name="categoryId" defaultValue="" className="field-select">
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
          <input type="date" name="nextDueDate" required className="field-input" />
        </label>

        <RecurrenceFields initialInterval={1} initialUnit="month" />

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
                  defaultChecked={option.value === 1}
                  className="h-4 w-4"
                />
              </label>
            ))}
          </div>
          <div className="mt-2 text-xs text-[var(--muted)]">Supported offsets: 0 / 1 / 3 / 7 days.</div>
        </div>

        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-[var(--ink)]">Note</span>
          <textarea name="note" rows={3} className="field-textarea" placeholder="Optional notes" />
        </label>

        <div className="flex items-center justify-end">
          <button type="submit" className="btn-primary">
            Save payment
          </button>
        </div>
      </form>
    </section>
  );
}
