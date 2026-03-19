"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUserId } from "@/server/auth";
import { completeUserOnboarding } from "@/server/services/settings";

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

const onboardingSchema = z.object({
  timezone: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine((value) => isValidTimeZone(value), "invalid timezone"),
  primaryCurrency: z.string().trim().toUpperCase().length(3),
  preferredReminderTime: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  notificationsEnabled: z.boolean(),
  notificationPermission: z.enum(["default", "granted", "denied", "unsupported"]),
});

export async function completeOnboardingAction(formData: FormData): Promise<void> {
  const parsed = onboardingSchema.safeParse({
    timezone: String(formData.get("timezone") ?? ""),
    primaryCurrency: String(formData.get("primaryCurrency") ?? ""),
    preferredReminderTime: String(formData.get("preferredReminderTime") ?? ""),
    notificationsEnabled: formData.get("notificationsEnabled") === "on",
    notificationPermission: String(formData.get("notificationPermission") ?? "default"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "invalid onboarding form");
  }

  const userId = await requireUserId();
  const notificationsEnabled =
    parsed.data.notificationsEnabled && parsed.data.notificationPermission !== "denied";

  await completeUserOnboarding(userId, {
    timezone: parsed.data.timezone,
    primaryCurrency: parsed.data.primaryCurrency,
    preferredReminderTime: parsed.data.preferredReminderTime,
    notificationsEnabled,
  });

  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/reminders");
  redirect("/");
}
