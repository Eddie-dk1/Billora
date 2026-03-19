"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOnboardedUserId } from "@/server/auth";
import { resolveAccessScopeForUser } from "@/server/context";
import {
  createPayment,
  markPaymentPaid,
  parseAmountToMinor,
  parseIsoDateOnly,
  stopPayment,
  updatePayment,
} from "@/server/services/payments";
import type { EarlyPaymentDecision, RecurrenceUnit } from "@/types/recurrence";

const contextSchema = z.enum(["personal", "shared"]);
const paymentTypeSchema = z.enum(["subscription", "bill"]);
const recurrenceUnitSchema = z.enum(["day", "week", "month", "year"]);
const reminderOffsetSchema = z.enum(["0", "1", "3", "7"]);

const basePaymentSchema = z.object({
  context: contextSchema,
  title: z.string().trim().min(1).max(120),
  paymentType: paymentTypeSchema,
  amount: z.string().trim().min(1),
  currency: z.string().trim().toUpperCase().length(3),
  nextDueDate: z.string().trim().min(1),
  recurrenceInterval: z.coerce.number().int().min(1).max(365),
  recurrenceUnit: recurrenceUnitSchema,
  categoryId: z.string().trim().optional(),
  note: z.string().trim().max(400).optional(),
  reminderOffsets: z.array(reminderOffsetSchema).default(["1"]),
});

const markPaidSchema = z.object({
  context: contextSchema,
  paymentId: z.string().trim().min(1),
  paidAt: z.string().trim().min(1),
  paidAmount: z.string().trim().optional(),
  currency: z.string().trim().toUpperCase().length(3).optional(),
  note: z.string().trim().max(400).optional(),
  earlyDecision: z.enum(["keep_schedule", "shift_schedule"]).optional(),
});

const stopPaymentSchema = z.object({
  context: contextSchema,
  paymentId: z.string().trim().min(1),
  filter: z.enum(["all", "subscription", "bill", "stopped"]).optional(),
});

function parseBasePaymentFormData(formData: FormData) {
  return basePaymentSchema.safeParse({
    context: String(formData.get("context") ?? ""),
    title: String(formData.get("title") ?? ""),
    paymentType: String(formData.get("paymentType") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    currency: String(formData.get("currency") ?? ""),
    nextDueDate: String(formData.get("nextDueDate") ?? ""),
    recurrenceInterval: String(formData.get("recurrenceInterval") ?? ""),
    recurrenceUnit: String(formData.get("recurrenceUnit") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    note: String(formData.get("note") ?? ""),
    reminderOffsets: formData.getAll("reminderOffsets").map((value) => String(value)),
  });
}

export async function createPaymentAction(formData: FormData): Promise<void> {
  const parsed = parseBasePaymentFormData(formData);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "invalid form");
  }

  const userId = await requireOnboardedUserId();
  const scope = await resolveAccessScopeForUser(userId, parsed.data.context);

  await createPayment(scope, {
    title: parsed.data.title,
    paymentType: parsed.data.paymentType,
    amountMinor: parseAmountToMinor(parsed.data.amount),
    currency: parsed.data.currency,
    nextDueDate: parseIsoDateOnly(parsed.data.nextDueDate),
    recurrenceInterval: parsed.data.recurrenceInterval,
    recurrenceUnit: parsed.data.recurrenceUnit as RecurrenceUnit,
    categoryId: parsed.data.categoryId,
    note: parsed.data.note,
    reminderOffsets: parsed.data.reminderOffsets.map((value) => Number(value)),
  });

  revalidatePath("/");
  revalidatePath("/payments");
  revalidatePath("/calendar");
  revalidatePath("/analytics");

  redirect(`/payments?context=${scope.context}`);
}

export async function updatePaymentAction(formData: FormData): Promise<void> {
  const paymentId = z.string().trim().min(1).parse(String(formData.get("paymentId") ?? ""));
  const parsed = parseBasePaymentFormData(formData);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "invalid form");
  }

  const userId = await requireOnboardedUserId();
  const scope = await resolveAccessScopeForUser(userId, parsed.data.context);

  const updateResult = await updatePayment(scope, paymentId, {
    title: parsed.data.title,
    paymentType: parsed.data.paymentType,
    amountMinor: parseAmountToMinor(parsed.data.amount),
    currency: parsed.data.currency,
    nextDueDate: parseIsoDateOnly(parsed.data.nextDueDate),
    recurrenceInterval: parsed.data.recurrenceInterval,
    recurrenceUnit: parsed.data.recurrenceUnit as RecurrenceUnit,
    categoryId: parsed.data.categoryId,
    note: parsed.data.note,
    reminderOffsets: parsed.data.reminderOffsets.map((value) => Number(value)),
  });

  if (updateResult.count === 0) {
    throw new Error("payment not found");
  }

  revalidatePath("/");
  revalidatePath("/payments");
  revalidatePath(`/payments/${paymentId}`);
  revalidatePath("/calendar");
  revalidatePath("/analytics");

  redirect(`/payments/${paymentId}?context=${scope.context}`);
}

export async function markPaymentPaidAction(formData: FormData): Promise<void> {
  const parsed = markPaidSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "invalid form");
  }

  const userId = await requireOnboardedUserId();
  const scope = await resolveAccessScopeForUser(userId, parsed.data.context);
  const paidAmountMinor = parsed.data.paidAmount ? parseAmountToMinor(parsed.data.paidAmount) : undefined;

  await markPaymentPaid(scope, parsed.data.paymentId, {
    paidAt: parseIsoDateOnly(parsed.data.paidAt),
    paidAmountMinor,
    currency: parsed.data.currency,
    note: parsed.data.note,
    earlyDecision: parsed.data.earlyDecision as EarlyPaymentDecision | undefined,
  });

  revalidatePath("/");
  revalidatePath("/payments");
  revalidatePath(`/payments/${parsed.data.paymentId}`);
  revalidatePath("/calendar");
  revalidatePath("/analytics");

  redirect(`/payments/${parsed.data.paymentId}?context=${scope.context}`);
}

export async function stopPaymentAction(formData: FormData): Promise<void> {
  const parsed = stopPaymentSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "invalid form");
  }

  const userId = await requireOnboardedUserId();
  const scope = await resolveAccessScopeForUser(userId, parsed.data.context);
  const stopResult = await stopPayment(scope, parsed.data.paymentId);

  if (stopResult.count === 0) {
    throw new Error("payment not found");
  }

  revalidatePath("/");
  revalidatePath("/payments");
  revalidatePath(`/payments/${parsed.data.paymentId}`);
  revalidatePath("/calendar");
  revalidatePath("/analytics");

  const filter = parsed.data.filter ?? "all";
  redirect(`/payments?context=${scope.context}&filter=${filter}`);
}

function formDataToObject(formData: FormData): Record<string, string> {
  const entries = Array.from(formData.entries()).map(([key, value]) => [key, String(value)]);
  return Object.fromEntries(entries);
}
