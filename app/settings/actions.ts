"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOnboardedUserId } from "@/server/auth";
import {
  resolveAccessScopeForUser,
  setActivePersonalContextForUser,
  setActiveSharedContextForUser,
} from "@/server/context";
import { createCategory, deleteCategory, updateCategory } from "@/server/services/categories";
import {
  createSharedAccount,
  joinSharedAccountById,
  leaveSharedAccount,
  listSharedAccountsForUser,
  removeSharedAccountMember,
} from "@/server/services/shared-accounts";
import { updateUserSettings } from "@/server/services/settings";

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

const contextSchema = z.enum(["personal", "shared"]);

const settingsSchema = z.object({
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
});

const createCategorySchema = z.object({
  context: contextSchema,
  name: z.string().trim().min(1).max(40),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "invalid color"),
});

const updateCategorySchema = z.object({
  context: contextSchema,
  categoryId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(40),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "invalid color"),
});

const deleteCategorySchema = z.object({
  context: contextSchema,
  categoryId: z.string().trim().min(1),
});

const createSharedSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

const joinSharedSchema = z.object({
  sharedAccountId: z.string().trim().min(1),
});

const switchSharedSchema = z.object({
  sharedAccountId: z.string().trim().min(1),
});

const removeMemberSchema = z.object({
  sharedAccountId: z.string().trim().min(1),
  memberUserId: z.string().trim().min(1),
});

const leaveSharedSchema = z.object({
  sharedAccountId: z.string().trim().min(1),
});

export async function saveSettingsAction(formData: FormData): Promise<void> {
  const parsed = settingsSchema.safeParse({
    timezone: String(formData.get("timezone") ?? ""),
    primaryCurrency: String(formData.get("primaryCurrency") ?? ""),
    preferredReminderTime: String(formData.get("preferredReminderTime") ?? ""),
    notificationsEnabled: formData.get("notificationsEnabled") === "on",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "invalid settings");
  }

  const userId = await requireOnboardedUserId();
  await updateUserSettings(userId, parsed.data);
  revalidateAll();
}

export async function createCategoryAction(formData: FormData): Promise<void> {
  const parsed = createCategorySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "invalid category");
  }

  const userId = await requireOnboardedUserId();
  const scope = await resolveAccessScopeForUser(userId, parsed.data.context);

  await createCategory(scope, {
    name: parsed.data.name,
    color: parsed.data.color,
  });

  revalidateAll();
}

export async function updateCategoryAction(formData: FormData): Promise<void> {
  const parsed = updateCategorySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "invalid category");
  }

  const userId = await requireOnboardedUserId();
  const scope = await resolveAccessScopeForUser(userId, parsed.data.context);

  const result = await updateCategory(scope, parsed.data.categoryId, {
    name: parsed.data.name,
    color: parsed.data.color,
  });

  if (result.count === 0) {
    throw new Error("category not found");
  }

  revalidateAll();
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const parsed = deleteCategorySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "invalid category");
  }

  const userId = await requireOnboardedUserId();
  const scope = await resolveAccessScopeForUser(userId, parsed.data.context);

  const result = await deleteCategory(scope, parsed.data.categoryId);
  if (result.count === 0) {
    throw new Error("category not found");
  }

  revalidateAll();
}

export async function createSharedAccountAction(formData: FormData): Promise<void> {
  const parsed = createSharedSchema.safeParse({
    name: String(formData.get("name") ?? ""),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "invalid shared account");
  }

  const userId = await requireOnboardedUserId();
  const sharedAccountId = await createSharedAccount(userId, parsed.data.name);
  await setActiveSharedContextForUser(userId, sharedAccountId);

  revalidateAll();
  redirect(`/settings?context=shared&sharedId=${sharedAccountId}`);
}

export async function joinSharedAccountAction(formData: FormData): Promise<void> {
  const parsed = joinSharedSchema.safeParse({
    sharedAccountId: String(formData.get("sharedAccountId") ?? ""),
  });

  if (!parsed.success) {
    redirect("/settings?context=shared&joinError=invalid_id");
  }

  const userId = await requireOnboardedUserId();

  try {
    await joinSharedAccountById(userId, parsed.data.sharedAccountId);
    await setActiveSharedContextForUser(userId, parsed.data.sharedAccountId);
  } catch {
    redirect(`/settings?context=shared&joinError=not_found&joinSharedId=${parsed.data.sharedAccountId}`);
  }

  revalidateAll();
  redirect(`/settings?context=shared&sharedId=${parsed.data.sharedAccountId}`);
}

export async function switchSharedAccountAction(formData: FormData): Promise<void> {
  const parsed = switchSharedSchema.safeParse({
    sharedAccountId: String(formData.get("sharedAccountId") ?? ""),
  });

  if (!parsed.success) {
    throw new Error("invalid shared account id");
  }

  const userId = await requireOnboardedUserId();
  await setActiveSharedContextForUser(userId, parsed.data.sharedAccountId);

  revalidateAll();
  redirect(`/settings?context=shared&sharedId=${parsed.data.sharedAccountId}`);
}

export async function removeSharedMemberAction(formData: FormData): Promise<void> {
  const parsed = removeMemberSchema.safeParse({
    sharedAccountId: String(formData.get("sharedAccountId") ?? ""),
    memberUserId: String(formData.get("memberUserId") ?? ""),
  });

  if (!parsed.success) {
    throw new Error("invalid remove member form");
  }

  const userId = await requireOnboardedUserId();
  await removeSharedAccountMember(userId, parsed.data.sharedAccountId, parsed.data.memberUserId);

  revalidateAll();
  redirect(`/settings?context=shared&sharedId=${parsed.data.sharedAccountId}`);
}

export async function leaveSharedAccountAction(formData: FormData): Promise<void> {
  const parsed = leaveSharedSchema.safeParse({
    sharedAccountId: String(formData.get("sharedAccountId") ?? ""),
  });

  if (!parsed.success) {
    throw new Error("invalid leave form");
  }

  const userId = await requireOnboardedUserId();
  await leaveSharedAccount(userId, parsed.data.sharedAccountId);
  await setActivePersonalContextForUser(userId);

  revalidateAll();
  redirect("/settings?context=personal");
}

function revalidateAll(): void {
  revalidatePath("/");
  revalidatePath("/payments");
  revalidatePath("/payments/add");
  revalidatePath("/calendar");
  revalidatePath("/analytics");
  revalidatePath("/settings");
  revalidatePath("/reminders");
}

function formDataToObject(formData: FormData): Record<string, string> {
  const entries = Array.from(formData.entries()).map(([key, value]) => [key, String(value)]);
  return Object.fromEntries(entries);
}
