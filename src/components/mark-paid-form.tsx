"use client";

import { useMemo, useState } from "react";

type MarkPaidFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  context: "personal" | "shared";
  paymentId: string;
  dueDateIso: string;
  amountPlaceholder: string;
  currencyPlaceholder: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isMoreThanOneDayEarly(paidAt: string, dueDateIso: string): boolean {
  const paid = new Date(`${paidAt}T00:00:00.000Z`);
  const due = new Date(`${dueDateIso}T00:00:00.000Z`);

  if (Number.isNaN(paid.getTime()) || Number.isNaN(due.getTime())) {
    return false;
  }

  const diffDays = (due.getTime() - paid.getTime()) / MS_PER_DAY;
  return diffDays > 1;
}

export function MarkPaidForm({
  action,
  context,
  paymentId,
  dueDateIso,
  amountPlaceholder,
  currencyPlaceholder,
}: MarkPaidFormProps) {
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));

  const showEarlyDecision = useMemo(
    () => isMoreThanOneDayEarly(paidAt, dueDateIso),
    [paidAt, dueDateIso],
  );

  return (
    <form action={action} className="soft-card space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Payment Action</div>
          <h2 className="text-lg font-bold text-[var(--ink)]">Mark as Paid</h2>
        </div>
        <span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-semibold text-[var(--success)]">
          Updates next due date
        </span>
      </div>

      <input type="hidden" name="paymentId" value={paymentId} />
      <input type="hidden" name="context" value={context} />
      {!showEarlyDecision ? <input type="hidden" name="earlyDecision" value="keep_schedule" /> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-[var(--ink)]">Paid at</span>
          <input
            type="date"
            name="paidAt"
            value={paidAt}
            onChange={(event) => setPaidAt(event.target.value)}
            required
            className="field-input"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-[var(--ink)]">Paid amount (optional)</span>
          <input
            name="paidAmount"
            placeholder={amountPlaceholder}
            className="field-input"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-[var(--ink)]">Currency (optional)</span>
          <input
            name="currency"
            placeholder={currencyPlaceholder}
            className="field-input"
          />
        </label>

        {showEarlyDecision ? (
          <label className="block text-sm">
            <span className="mb-1.5 block font-semibold text-[var(--ink)]">Early payment behavior</span>
            <select
              name="earlyDecision"
              defaultValue="keep_schedule"
              className="field-select"
            >
              <option value="keep_schedule">Keep schedule</option>
              <option value="shift_schedule">Shift from paid date</option>
            </select>
          </label>
        ) : (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-xs text-[var(--muted)]">
            Early-payment option appears only when payment is made more than 1 day before due date.
          </div>
        )}
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block font-semibold text-[var(--ink)]">Note</span>
        <textarea
          name="note"
          rows={2}
          className="field-textarea"
        />
      </label>

      <div className="flex justify-end">
        <button type="submit" className="btn-success">
          Mark paid
        </button>
      </div>
    </form>
  );
}
