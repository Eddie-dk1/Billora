import { prisma } from "@/lib/prisma";

export type UserSettings = {
  timezone: string;
  primaryCurrency: string;
  preferredReminderTime: string;
  notificationsEnabled: boolean;
};

const DEFAULT_SETTINGS: UserSettings = {
  timezone: "UTC",
  primaryCurrency: "USD",
  preferredReminderTime: "09:00",
  notificationsEnabled: true,
};

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      timezone: true,
      primaryCurrency: true,
      preferredReminderTime: true,
      notificationsEnabled: true,
    },
  });

  if (!user) {
    return DEFAULT_SETTINGS;
  }

  return {
    timezone: user.timezone,
    primaryCurrency: user.primaryCurrency,
    preferredReminderTime: user.preferredReminderTime,
    notificationsEnabled: user.notificationsEnabled,
  };
}

export async function updateUserSettings(userId: string, input: UserSettings): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      timezone: input.timezone,
      primaryCurrency: input.primaryCurrency,
      preferredReminderTime: input.preferredReminderTime,
      notificationsEnabled: input.notificationsEnabled,
    },
  });
}

export async function isUserOnboardingComplete(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardingCompletedAt: true },
  });

  return Boolean(user?.onboardingCompletedAt);
}

export async function completeUserOnboarding(userId: string, input: UserSettings): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      timezone: input.timezone,
      primaryCurrency: input.primaryCurrency,
      preferredReminderTime: input.preferredReminderTime,
      notificationsEnabled: input.notificationsEnabled,
      onboardingCompletedAt: new Date(),
    },
  });
}
