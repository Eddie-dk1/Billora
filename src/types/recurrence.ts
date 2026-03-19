export type RecurrenceUnit = "day" | "week" | "month" | "year";

export interface RecurrenceRule {
  interval: number;
  unit: RecurrenceUnit;
}

export type EarlyPaymentDecision = "keep_schedule" | "shift_schedule";

export interface MarkPaidInput {
  oldNextDueDate: Date;
  paidAt: Date;
  recurrence: RecurrenceRule;
  earlyDecision?: EarlyPaymentDecision;
}

export interface MarkPaidResult {
  newNextDueDate: Date;
  scheduleAction: "on_time" | "early_keep" | "early_shift" | "late_shift";
}
