import { prisma } from "@/lib/prisma";

export type BrowserPushSubscriptionInput = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type StoredPushSubscription = {
  id: string;
  endpoint: string;
  expirationTime: number | null;
  p256dh: string;
  auth: string;
};

export async function upsertPushSubscription(
  userId: string,
  input: BrowserPushSubscriptionInput,
  userAgent?: string,
): Promise<void> {
  await prisma.pushSubscription.upsert({
    where: {
      endpoint: input.endpoint,
    },
    create: {
      userId,
      endpoint: input.endpoint,
      expirationTime:
        typeof input.expirationTime === "number" ? new Date(input.expirationTime) : null,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: userAgent?.trim() || null,
      isActive: true,
      lastUsedAt: null,
    },
    update: {
      userId,
      expirationTime:
        typeof input.expirationTime === "number" ? new Date(input.expirationTime) : null,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: userAgent?.trim() || null,
      isActive: true,
    },
  });
}

export async function deactivatePushSubscription(userId: string, endpoint: string): Promise<void> {
  await prisma.pushSubscription.updateMany({
    where: {
      userId,
      endpoint,
    },
    data: {
      isActive: false,
    },
  });
}

export async function deactivatePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
  await prisma.pushSubscription.updateMany({
    where: { endpoint },
    data: {
      isActive: false,
    },
  });
}

export async function listActivePushSubscriptionsForUser(userId: string): Promise<StoredPushSubscription[]> {
  const rows = await prisma.pushSubscription.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      id: true,
      endpoint: true,
      expirationTime: true,
      p256dh: true,
      auth: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    endpoint: row.endpoint,
    expirationTime: row.expirationTime?.getTime() ?? null,
    p256dh: row.p256dh,
    auth: row.auth,
  }));
}

export async function markPushSubscriptionUsed(subscriptionId: string, usedAt: Date): Promise<void> {
  await prisma.pushSubscription.update({
    where: {
      id: subscriptionId,
    },
    data: {
      lastUsedAt: usedAt,
    },
  });
}
