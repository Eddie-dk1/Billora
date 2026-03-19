import { prisma } from "@/lib/prisma";
import { resolveAccessScopeForUser, type AppContextType } from "@/server/context";

type ReminderRunResult = {
  runAt: string;
  usersProcessed: number;
  paymentsConsidered: number;
  logsCreated: number;
  logsSkippedExisting: number;
  pushAttempted: number;
  pushSent: number;
  pushFailed: number;
  pushSkipped: number;
};

type UserWithMemberships = {
  id: string;
  timezone: string;
  preferredReminderTime: string;
  notificationsEnabled: boolean;
  sharedMemberships: Array<{ sharedAccountId: string }>;
};

export type InAppReminderItem = {
  id: string;
  title: string;
  targetDueDate: string;
  reminderOffsetDays: number;
  createdAt: string;
  isRead: boolean;
};

const DEFAULT_OFFSET_DAYS = 1;
const FALLBACK_TIMEZONE = "UTC";

type ReminderChannel = "in_app" | "push";
type ReminderStatus = "pending" | "sent" | "read" | "skipped" | "failed";

type PushAttemptResult = "sent" | "failed";

const MAX_PUSH_ATTEMPTS = 3;
const PUSH_RETRY_BACKOFF_MINUTES = [0, 5, 30];

export async function runRemindersJob(runAt = new Date()): Promise<ReminderRunResult> {
  const users = (await prisma.user.findMany({
    select: {
      id: true,
      timezone: true,
      preferredReminderTime: true,
      notificationsEnabled: true,
      sharedMemberships: {
        select: {
          sharedAccountId: true,
        },
      },
    },
  })) as UserWithMemberships[];

  let paymentsConsidered = 0;
  let logsCreated = 0;
  let logsSkippedExisting = 0;
  let pushAttempted = 0;
  let pushSent = 0;
  let pushFailed = 0;
  let pushSkipped = 0;

  for (const user of users) {
    const payments = await listAccessiblePayments(user.id, user.sharedMemberships.map((m) => m.sharedAccountId));

    for (const payment of payments) {
      paymentsConsidered += 1;
      const offsets = payment.reminders.length > 0
        ? payment.reminders.map((entry) => entry.offsetDays)
        : [DEFAULT_OFFSET_DAYS];

      const dueDateIso = payment.nextDueDate.toISOString().slice(0, 10);

      for (const offsetDays of offsets) {
        if (!shouldTriggerReminder(runAt, dueDateIso, offsetDays, user.preferredReminderTime, user.timezone)) {
          continue;
        }

        const inAppCreated = await createNotificationLogIfMissing({
          userId: user.id,
          paymentId: payment.id,
          targetDueDate: payment.nextDueDate,
          reminderOffsetDays: offsetDays,
          channel: "in_app",
          status: "sent",
          sentAt: runAt,
        });

        if (inAppCreated) {
          logsCreated += 1;
        } else {
          logsSkippedExisting += 1;
        }

        const pushCreated = await createNotificationLogIfMissing({
          userId: user.id,
          paymentId: payment.id,
          targetDueDate: payment.nextDueDate,
          reminderOffsetDays: offsetDays,
          channel: "push",
          status: user.notificationsEnabled ? "pending" : "skipped",
          sentAt: user.notificationsEnabled ? null : runAt,
          errorMessage: user.notificationsEnabled ? null : "notifications_disabled",
        });

        if (pushCreated) {
          logsCreated += 1;
        } else {
          logsSkippedExisting += 1;
        }
      }
    }
  }

  const pushLogs = await prisma.notificationLog.findMany({
    where: {
      channel: "push",
      OR: [
        { status: "pending" },
        { status: "failed" },
        { status: "queued" },
      ],
    },
    select: {
      id: true,
      userId: true,
      attemptCount: true,
      lastAttemptAt: true,
      status: true,
    },
  });

  const usersById = new Map(users.map((user) => [user.id, user]));

  for (const log of pushLogs) {
    const user = usersById.get(log.userId);
    if (!user) {
      continue;
    }

    if (!shouldAttemptPushRetry(runAt, log.attemptCount, log.lastAttemptAt)) {
      continue;
    }

    if (log.attemptCount >= MAX_PUSH_ATTEMPTS) {
      await prisma.notificationLog.update({
        where: { id: log.id },
        data: {
          status: "skipped",
          errorMessage: "retry_limit_reached",
          lastAttemptAt: runAt,
        },
      });
      pushSkipped += 1;
      continue;
    }

    pushAttempted += 1;
    const nextAttemptCount = log.attemptCount + 1;
    const delivery = await attemptPushDelivery();

    if (delivery === "sent") {
      await prisma.notificationLog.update({
        where: { id: log.id },
        data: {
          status: "sent",
          sentAt: runAt,
          lastAttemptAt: runAt,
          attemptCount: nextAttemptCount,
          errorMessage: null,
        },
      });
      pushSent += 1;
      continue;
    }

    const terminal = nextAttemptCount >= MAX_PUSH_ATTEMPTS;
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: {
        status: terminal ? "skipped" : "failed",
        lastAttemptAt: runAt,
        attemptCount: nextAttemptCount,
        errorMessage: terminal ? "retry_limit_reached" : "push_delivery_failed",
      },
    });
    if (terminal) {
      pushSkipped += 1;
    } else {
      pushFailed += 1;
    }
  }

  return {
    runAt: runAt.toISOString(),
    usersProcessed: users.length,
    paymentsConsidered,
    logsCreated,
    logsSkippedExisting,
    pushAttempted,
    pushSent,
    pushFailed,
    pushSkipped,
  };
}

export async function getInAppReminders(
  userId: string,
  options?: { context?: AppContextType; limit?: number; unreadOnly?: boolean },
): Promise<InAppReminderItem[]> {
  try {
    const limit = options?.limit && options.limit > 0 ? Math.min(options.limit, 100) : 50;

    let allowedPaymentIds: string[] | undefined;
    if (options?.context) {
      const owner = await resolveAccessScopeForUser(userId, options.context, { fallbackToPersonal: true });
      const payments = await prisma.payment.findMany({
        where: {
          ownerType: owner.ownerType,
          ownerId: owner.ownerId,
        },
        select: {
          id: true,
        },
      });

      allowedPaymentIds = payments.map((payment) => payment.id);
      if (allowedPaymentIds.length === 0) {
        return [];
      }
    }

    const logs = await prisma.notificationLog.findMany({
      where: {
        userId,
        channel: "in_app",
        status: options?.unreadOnly ? "sent" : { in: ["sent", "read"] },
        ...(allowedPaymentIds ? { paymentId: { in: allowedPaymentIds } } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    const paymentIds = Array.from(new Set(logs.map((log) => log.paymentId)));
    const payments = await prisma.payment.findMany({
      where: { id: { in: paymentIds } },
      select: { id: true, title: true },
    });

    const titleByPaymentId = new Map(payments.map((payment) => [payment.id, payment.title]));

    return logs.map((log) => ({
      id: log.id,
      title: titleByPaymentId.get(log.paymentId) ?? "Payment",
      targetDueDate: log.targetDueDate.toISOString(),
      reminderOffsetDays: log.reminderOffsetDays,
      createdAt: log.createdAt.toISOString(),
      isRead: log.status === "read",
    }));
  } catch {
    return [];
  }
}

export async function getUnreadInAppRemindersCount(
  userId: string,
  context?: AppContextType,
): Promise<number> {
  try {
    let allowedPaymentIds: string[] | undefined;

    if (context) {
      const owner = await resolveAccessScopeForUser(userId, context, { fallbackToPersonal: true });
      const payments = await prisma.payment.findMany({
        where: {
          ownerType: owner.ownerType,
          ownerId: owner.ownerId,
        },
        select: { id: true },
      });

      allowedPaymentIds = payments.map((payment) => payment.id);
      if (allowedPaymentIds.length === 0) {
        return 0;
      }
    }

    return prisma.notificationLog.count({
      where: {
        userId,
        channel: "in_app",
        status: "sent",
        ...(allowedPaymentIds ? { paymentId: { in: allowedPaymentIds } } : {}),
      },
    });
  } catch {
    return 0;
  }
}

export async function markInAppReminderAsRead(userId: string, reminderId: string): Promise<void> {
  try {
    await prisma.notificationLog.updateMany({
      where: {
        id: reminderId,
        userId,
        channel: "in_app",
        status: { in: ["sent", "read"] },
      },
      data: {
        status: "read",
      },
    });
  } catch {
    return;
  }
}

export async function markInAppReminderAsUnread(userId: string, reminderId: string): Promise<void> {
  try {
    await prisma.notificationLog.updateMany({
      where: {
        id: reminderId,
        userId,
        channel: "in_app",
        status: { in: ["sent", "read"] },
      },
      data: {
        status: "sent",
      },
    });
  } catch {
    return;
  }
}

export async function markAllInAppRemindersAsRead(userId: string, context?: AppContextType): Promise<number> {
  try {
    let allowedPaymentIds: string[] | undefined;

    if (context) {
      const owner = await resolveAccessScopeForUser(userId, context, { fallbackToPersonal: true });
      const payments = await prisma.payment.findMany({
        where: {
          ownerType: owner.ownerType,
          ownerId: owner.ownerId,
        },
        select: { id: true },
      });

      allowedPaymentIds = payments.map((payment) => payment.id);
      if (allowedPaymentIds.length === 0) {
        return 0;
      }
    }

    const result = await prisma.notificationLog.updateMany({
      where: {
        userId,
        channel: "in_app",
        status: "sent",
        ...(allowedPaymentIds ? { paymentId: { in: allowedPaymentIds } } : {}),
      },
      data: {
        status: "read",
      },
    });

    return result.count;
  } catch {
    return 0;
  }
}

async function listAccessiblePayments(userId: string, sharedAccountIds: string[]) {
  const baseWhere = {
    status: "active",
    OR: [
      { ownerType: "personal", ownerId: userId },
      ...(sharedAccountIds.length > 0
        ? [{ ownerType: "shared", ownerId: { in: sharedAccountIds } }]
        : []),
    ],
  };

  return prisma.payment.findMany({
    where: baseWhere,
    include: {
      reminders: {
        select: {
          offsetDays: true,
        },
      },
    },
  });
}

function shouldTriggerReminder(
  now: Date,
  dueDateIso: string,
  offsetDays: number,
  preferredReminderTime: string,
  timezone: string,
): boolean {
  const reminderDate = shiftIsoDate(dueDateIso, -offsetDays);
  const zonedNow = getZonedParts(now, timezone);

  if (zonedNow.date !== reminderDate) {
    return false;
  }

  return zonedNow.time >= normalizeReminderTime(preferredReminderTime);
}

function normalizeReminderTime(value: string): string {
  if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(value)) {
    return value;
  }
  return "09:00";
}

function shiftIsoDate(isoDate: string, deltaDays: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

function getZonedParts(date: Date, timezone: string): { date: string; time: string } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: resolveTimezone(timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }

  return {
    date: `${map.year}-${map.month}-${map.day}`,
    time: `${map.hour}:${map.minute}`,
  };
}

function resolveTimezone(timezone: string): string {
  if (!timezone || timezone.trim().length === 0) {
    return FALLBACK_TIMEZONE;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return FALLBACK_TIMEZONE;
  }
}

async function createNotificationLogIfMissing(input: {
  userId: string;
  paymentId: string;
  targetDueDate: Date;
  reminderOffsetDays: number;
  channel: ReminderChannel;
  status: ReminderStatus;
  sentAt: Date | null;
  errorMessage?: string | null;
}): Promise<boolean> {
  const existing = await prisma.notificationLog.findFirst({
    where: {
      userId: input.userId,
      paymentId: input.paymentId,
      targetDueDate: input.targetDueDate,
      reminderOffsetDays: input.reminderOffsetDays,
      channel: input.channel,
    },
    select: { id: true },
  });

  if (existing) {
    return false;
  }

  const initialAttemptCount = input.channel === "push" && input.status === "pending" ? 0 : 0;

  await prisma.notificationLog.create({
    data: {
      userId: input.userId,
      paymentId: input.paymentId,
      targetDueDate: input.targetDueDate,
      reminderOffsetDays: input.reminderOffsetDays,
      channel: input.channel,
      status: input.status,
      sentAt: input.sentAt,
      lastAttemptAt: input.sentAt,
      errorMessage: input.errorMessage ?? null,
      attemptCount: initialAttemptCount,
    },
  });

  return true;
}

async function attemptPushDelivery(): Promise<PushAttemptResult> {
  return "failed";
}

export function shouldAttemptPushRetry(
  runAt: Date,
  attemptCount: number,
  lastAttemptAt: Date | null,
): boolean {
  if (attemptCount >= MAX_PUSH_ATTEMPTS) {
    return false;
  }

  const delayMinutes = PUSH_RETRY_BACKOFF_MINUTES[Math.max(0, attemptCount)] ?? 60;
  if (!lastAttemptAt) {
    return true;
  }

  const nextAttemptAt = lastAttemptAt.getTime() + delayMinutes * 60 * 1000;
  return runAt.getTime() >= nextAttemptAt;
}
