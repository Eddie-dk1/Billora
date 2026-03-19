"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { z } from "zod";
import { requireOnboardedUserId } from "@/server/auth";
import type { AppContextType } from "@/server/context";
import {
  markAllInAppRemindersAsRead,
  markInAppReminderAsRead,
  markInAppReminderAsUnread,
} from "@/server/services/reminders";

const contextSchema = z.enum(["personal", "shared"]);
const filterSchema = z.enum(["all", "unread"]);

const itemActionSchema = z.object({
  reminderId: z.string().trim().min(1),
  context: contextSchema,
  filter: filterSchema,
});

const markAllSchema = z.object({
  context: contextSchema,
  filter: filterSchema,
});

function revalidateAll(): void {
  revalidatePath("/");
  revalidatePath("/reminders");
}

function redirectBack(context: AppContextType, filter: "all" | "unread"): never {
  const target = `/reminders?context=${context}&filter=${filter}` as Route;
  redirect(target);
}

export async function markReminderReadAction(formData: FormData): Promise<void> {
  const parsed = itemActionSchema.safeParse({
    reminderId: String(formData.get("reminderId") ?? ""),
    context: String(formData.get("context") ?? ""),
    filter: String(formData.get("filter") ?? ""),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "invalid form");
  }

  const userId = await requireOnboardedUserId();
  await markInAppReminderAsRead(userId, parsed.data.reminderId);
  revalidateAll();
  redirectBack(parsed.data.context, parsed.data.filter);
}

export async function markReminderUnreadAction(formData: FormData): Promise<void> {
  const parsed = itemActionSchema.safeParse({
    reminderId: String(formData.get("reminderId") ?? ""),
    context: String(formData.get("context") ?? ""),
    filter: String(formData.get("filter") ?? ""),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "invalid form");
  }

  const userId = await requireOnboardedUserId();
  await markInAppReminderAsUnread(userId, parsed.data.reminderId);
  revalidateAll();
  redirectBack(parsed.data.context, parsed.data.filter);
}

export async function markAllRemindersReadAction(formData: FormData): Promise<void> {
  const parsed = markAllSchema.safeParse({
    context: String(formData.get("context") ?? ""),
    filter: String(formData.get("filter") ?? ""),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "invalid form");
  }

  const userId = await requireOnboardedUserId();
  await markAllInAppRemindersAsRead(userId, parsed.data.context);
  revalidateAll();
  redirectBack(parsed.data.context, parsed.data.filter);
}

