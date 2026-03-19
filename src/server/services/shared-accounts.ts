import { prisma } from "@/lib/prisma";

export type SharedAccountSummary = {
  id: string;
  name: string;
  joinedAt: Date;
  membersCount: number;
  isOwner: boolean;
};

export type SharedMemberSummary = {
  userId: string;
  name: string;
  email: string;
  joinedAt: Date;
  isOwner: boolean;
};

export async function createSharedAccount(userId: string, name: string): Promise<string> {
  const shared = await prisma.sharedAccount.create({
    data: {
      name: name.trim(),
      createdByUserId: userId,
      members: {
        create: {
          userId,
        },
      },
    },
    select: { id: true },
  });

  return shared.id;
}

export async function joinSharedAccountById(userId: string, sharedAccountId: string): Promise<void> {
  const account = await prisma.sharedAccount.findUnique({
    where: { id: sharedAccountId },
    select: { id: true },
  });

  if (!account) {
    throw new Error("shared account not found");
  }

  await prisma.sharedAccountMember.upsert({
    where: {
      sharedAccountId_userId: {
        sharedAccountId,
        userId,
      },
    },
    update: {},
    create: {
      sharedAccountId,
      userId,
    },
  });
}

export async function listSharedAccountsForUser(userId: string): Promise<SharedAccountSummary[]> {
  const memberships = await prisma.sharedAccountMember.findMany({
    where: { userId },
    select: {
      joinedAt: true,
      sharedAccount: {
        select: {
          id: true,
          name: true,
          createdByUserId: true,
          _count: {
            select: {
              members: true,
            },
          },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return memberships.map((item) => ({
    id: item.sharedAccount.id,
    name: item.sharedAccount.name,
    joinedAt: item.joinedAt,
    membersCount: item.sharedAccount._count.members,
    isOwner: item.sharedAccount.createdByUserId === userId,
  }));
}

export async function listSharedAccountMembers(userId: string, sharedAccountId: string): Promise<SharedMemberSummary[]> {
  const [membership, account] = await Promise.all([
    prisma.sharedAccountMember.findUnique({
      where: {
        sharedAccountId_userId: {
          sharedAccountId,
          userId,
        },
      },
      select: { id: true },
    }),
    prisma.sharedAccount.findUnique({
      where: { id: sharedAccountId },
      select: { createdByUserId: true },
    }),
  ]);

  if (!membership || !account) {
    throw new Error("forbidden");
  }

  const members = await prisma.sharedAccountMember.findMany({
    where: { sharedAccountId },
    select: {
      joinedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return members.map((item) => ({
    userId: item.user.id,
    name: item.user.name ?? item.user.email,
    email: item.user.email,
    joinedAt: item.joinedAt,
    isOwner: item.user.id === account.createdByUserId,
  }));
}

export async function removeSharedAccountMember(
  requesterUserId: string,
  sharedAccountId: string,
  targetUserId: string,
): Promise<void> {
  const account = await prisma.sharedAccount.findUnique({
    where: { id: sharedAccountId },
    select: { createdByUserId: true },
  });

  if (!account) {
    throw new Error("shared account not found");
  }

  if (account.createdByUserId !== requesterUserId) {
    throw new Error("forbidden");
  }

  if (targetUserId === account.createdByUserId) {
    throw new Error("cannot remove owner");
  }

  await prisma.sharedAccountMember.deleteMany({
    where: {
      sharedAccountId,
      userId: targetUserId,
    },
  });
}

export async function leaveSharedAccount(userId: string, sharedAccountId: string): Promise<void> {
  const account = await prisma.sharedAccount.findUnique({
    where: { id: sharedAccountId },
    select: {
      createdByUserId: true,
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  if (!account) {
    throw new Error("shared account not found");
  }

  if (account.createdByUserId === userId) {
    throw new Error("owner cannot leave account");
  }

  await prisma.sharedAccountMember.deleteMany({
    where: {
      sharedAccountId,
      userId,
    },
  });
}
