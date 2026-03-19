import { prisma } from "@/lib/prisma";

export type AppContextType = "personal" | "shared";
export type OwnerType = "personal" | "shared";

type SearchParamsValue = string | string[] | undefined;

export type SearchParamsLike = Record<string, SearchParamsValue>;

export type AccessScope = {
  userId: string;
  context: AppContextType;
  ownerType: OwnerType;
  ownerId: string;
};

export function resolveContextFromSearchParams(searchParams: SearchParamsLike): AppContextType {
  const raw = searchParams.context;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "shared" ? "shared" : "personal";
}

export async function resolveAccessScopeForUser(
  userId: string,
  context: AppContextType,
  options?: { fallbackToPersonal?: boolean },
): Promise<AccessScope> {
  if (context === "personal") {
    await setActiveContextForUser(userId, "personal", null);
    return { userId, context: "personal", ownerType: "personal", ownerId: userId };
  }

  const [user, membership] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        activeContextType: true,
        activeContextId: true,
      },
    }),
    prisma.sharedAccountMember.findFirst({
      where: { userId },
      select: { sharedAccountId: true },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  if (!membership) {
    if (options?.fallbackToPersonal) {
      await setActiveContextForUser(userId, "personal", null);
      return { userId, context: "personal", ownerType: "personal", ownerId: userId };
    }

    throw new Error("shared context unavailable");
  }

  const sharedAccountId =
    user?.activeContextType === "shared" && user.activeContextId
      ? user.activeContextId
      : membership.sharedAccountId;

  const hasAccess = await prisma.sharedAccountMember.findUnique({
    where: {
      sharedAccountId_userId: {
        sharedAccountId,
        userId,
      },
    },
    select: { id: true },
  });

  const ownerId = hasAccess ? sharedAccountId : membership.sharedAccountId;
  await setActiveContextForUser(userId, "shared", ownerId);

  return { userId, context: "shared", ownerType: "shared", ownerId };
}

export async function ensureSharedMembership(userId: string, sharedAccountId: string): Promise<void> {
  const membership = await prisma.sharedAccountMember.findUnique({
    where: {
      sharedAccountId_userId: {
        sharedAccountId,
        userId,
      },
    },
    select: { id: true },
  });

  if (!membership) {
    throw new Error("forbidden");
  }
}

export async function setActiveSharedContextForUser(userId: string, sharedAccountId: string): Promise<void> {
  await ensureSharedMembership(userId, sharedAccountId);
  await setActiveContextForUser(userId, "shared", sharedAccountId);
}

export async function setActivePersonalContextForUser(userId: string): Promise<void> {
  await setActiveContextForUser(userId, "personal", null);
}

async function setActiveContextForUser(
  userId: string,
  activeContextType: AppContextType,
  activeContextId: string | null,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      activeContextType,
      activeContextId,
    },
  });
}
