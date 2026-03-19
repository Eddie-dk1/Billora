import { prisma } from "@/lib/prisma";
import type { AccessScope } from "@/server/context";

export type CategoryRecord = {
  id: string;
  ownerType: string;
  ownerId: string;
  name: string;
  color: string;
  isArchived: boolean;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function listCategories(
  scope: AccessScope,
  options?: { includeArchived?: boolean },
): Promise<CategoryRecord[]> {
  const includeArchived = options?.includeArchived ?? false;

  const result = await prisma.category.findMany({
    where: {
      ownerType: scope.ownerType,
      ownerId: scope.ownerId,
      ...(includeArchived ? {} : { isArchived: false }),
    },
    orderBy: [{ name: "asc" }],
  });

  return result as CategoryRecord[];
}

export async function createCategory(
  scope: AccessScope,
  input: { name: string; color: string },
): Promise<CategoryRecord> {
  const name = input.name.trim();

  const result = await prisma.category.create({
    data: {
      ownerType: scope.ownerType,
      ownerId: scope.ownerId,
      name,
      color: input.color,
      createdByUserId: scope.userId,
    },
  });

  return result as CategoryRecord;
}

export async function updateCategory(
  scope: AccessScope,
  categoryId: string,
  input: { name: string; color: string },
): Promise<{ count: number }> {
  return prisma.category.updateMany({
    where: {
      id: categoryId,
      ownerType: scope.ownerType,
      ownerId: scope.ownerId,
    },
    data: {
      name: input.name.trim(),
      color: input.color,
    },
  });
}

export async function deleteCategory(scope: AccessScope, categoryId: string): Promise<{ count: number }> {
  return prisma.$transaction(async (tx) => {
    await tx.payment.updateMany({
      where: {
        categoryId,
        ownerType: scope.ownerType,
        ownerId: scope.ownerId,
      },
      data: {
        categoryId: null,
      },
    });

    return tx.category.deleteMany({
      where: {
        id: categoryId,
        ownerType: scope.ownerType,
        ownerId: scope.ownerId,
      },
    });
  });
}

export async function categoryExistsInScope(scope: AccessScope, categoryId: string): Promise<boolean> {
  const count = await prisma.category.count({
    where: {
      id: categoryId,
      ownerType: scope.ownerType,
      ownerId: scope.ownerId,
      isArchived: false,
    },
  });

  return count > 0;
}
