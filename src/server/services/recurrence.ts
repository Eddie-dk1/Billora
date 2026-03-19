import {
  type MarkPaidInput,
  type MarkPaidResult,
  type RecurrenceRule,
  type RecurrenceUnit,
} from "@/types/recurrence";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function endOfMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function addMonthsOrYears(date: Date, interval: number, unit: "month" | "year"): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const monthOffset = unit === "month" ? interval : interval * 12;
  const targetMonthAbsolute = year * 12 + month + monthOffset;
  const targetYear = Math.floor(targetMonthAbsolute / 12);
  const targetMonth = ((targetMonthAbsolute % 12) + 12) % 12;
  const maxDay = endOfMonth(targetYear, targetMonth);
  const resolvedDay = Math.min(day, maxDay);

  return new Date(Date.UTC(targetYear, targetMonth, resolvedDay));
}

export function addRecurrence(referenceDate: Date, recurrence: RecurrenceRule): Date {
  const start = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate(),
    ),
  );

  if (recurrence.interval <= 0) {
    throw new Error("recurrence interval must be > 0");
  }

  switch (recurrence.unit) {
    case "day":
      return new Date(start.getTime() + recurrence.interval * MS_PER_DAY);
    case "week":
      return new Date(start.getTime() + recurrence.interval * 7 * MS_PER_DAY);
    case "month":
    case "year":
      return addMonthsOrYears(start, recurrence.interval, recurrence.unit);
    default: {
      const _exhaustive: never = recurrence.unit;
      throw new Error(`unsupported recurrence unit: ${_exhaustive satisfies RecurrenceUnit}`);
    }
  }
}

function dayDiff(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const utcB = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.floor((utcA - utcB) / MS_PER_DAY);
}

export function calculateNextDueDateOnMarkPaid(input: MarkPaidInput): MarkPaidResult {
  const { oldNextDueDate, paidAt, recurrence } = input;
  const diff = dayDiff(paidAt, oldNextDueDate);

  if (diff === 0) {
    return {
      newNextDueDate: addRecurrence(oldNextDueDate, recurrence),
      scheduleAction: "on_time",
    };
  }

  if (diff < 0) {
    const daysEarly = Math.abs(diff);
    if (daysEarly <= 1) {
      return {
        newNextDueDate: addRecurrence(oldNextDueDate, recurrence),
        scheduleAction: "early_keep",
      };
    }

    if (input.earlyDecision === "shift_schedule") {
      return {
        newNextDueDate: addRecurrence(paidAt, recurrence),
        scheduleAction: "early_shift",
      };
    }

    return {
      newNextDueDate: addRecurrence(oldNextDueDate, recurrence),
      scheduleAction: "early_keep",
    };
  }

  return {
    newNextDueDate: addRecurrence(paidAt, recurrence),
    scheduleAction: "late_shift",
  };
}
