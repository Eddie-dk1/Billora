import {
  calculateNextDueDateOnMarkPaid,
  addRecurrence,
} from "@/server/services/recurrence";
import { describe, expect, it } from "vitest";

describe("addRecurrence", () => {
  it("handles monthly edge case Jan 31 -> Feb 28", () => {
    const start = new Date(Date.UTC(2026, 0, 31));
    const next = addRecurrence(start, { interval: 1, unit: "month" });
    expect(next.toISOString().slice(0, 10)).toBe("2026-02-28");
  });

  it("handles leap year rollover Feb 29 -> Feb 28 next year", () => {
    const start = new Date(Date.UTC(2024, 1, 29));
    const next = addRecurrence(start, { interval: 1, unit: "year" });
    expect(next.toISOString().slice(0, 10)).toBe("2025-02-28");
  });

  it("handles every 2 weeks", () => {
    const start = new Date(Date.UTC(2026, 2, 10));
    const next = addRecurrence(start, { interval: 2, unit: "week" });
    expect(next.toISOString().slice(0, 10)).toBe("2026-03-24");
  });
});

describe("calculateNextDueDateOnMarkPaid", () => {
  it("on-time payment keeps cadence", () => {
    const result = calculateNextDueDateOnMarkPaid({
      oldNextDueDate: new Date(Date.UTC(2026, 3, 10)),
      paidAt: new Date(Date.UTC(2026, 3, 10)),
      recurrence: { interval: 1, unit: "month" },
    });

    expect(result.scheduleAction).toBe("on_time");
    expect(result.newNextDueDate.toISOString().slice(0, 10)).toBe("2026-05-10");
  });

  it("early payment >1 day with keep schedule", () => {
    const result = calculateNextDueDateOnMarkPaid({
      oldNextDueDate: new Date(Date.UTC(2026, 3, 10)),
      paidAt: new Date(Date.UTC(2026, 3, 5)),
      recurrence: { interval: 1, unit: "month" },
      earlyDecision: "keep_schedule",
    });

    expect(result.scheduleAction).toBe("early_keep");
    expect(result.newNextDueDate.toISOString().slice(0, 10)).toBe("2026-05-10");
  });

  it("early payment >1 day with shift schedule", () => {
    const result = calculateNextDueDateOnMarkPaid({
      oldNextDueDate: new Date(Date.UTC(2026, 3, 10)),
      paidAt: new Date(Date.UTC(2026, 3, 5)),
      recurrence: { interval: 1, unit: "month" },
      earlyDecision: "shift_schedule",
    });

    expect(result.scheduleAction).toBe("early_shift");
    expect(result.newNextDueDate.toISOString().slice(0, 10)).toBe("2026-05-05");
  });

  it("early payment within 1 day defaults to keep schedule", () => {
    const result = calculateNextDueDateOnMarkPaid({
      oldNextDueDate: new Date(Date.UTC(2026, 3, 10)),
      paidAt: new Date(Date.UTC(2026, 3, 9)),
      recurrence: { interval: 1, unit: "month" },
    });

    expect(result.scheduleAction).toBe("early_keep");
    expect(result.newNextDueDate.toISOString().slice(0, 10)).toBe("2026-05-10");
  });

  it("late payment shifts from paid date", () => {
    const result = calculateNextDueDateOnMarkPaid({
      oldNextDueDate: new Date(Date.UTC(2026, 3, 10)),
      paidAt: new Date(Date.UTC(2026, 3, 15)),
      recurrence: { interval: 1, unit: "month" },
    });

    expect(result.scheduleAction).toBe("late_shift");
    expect(result.newNextDueDate.toISOString().slice(0, 10)).toBe("2026-05-15");
  });
});
