import { prisma } from "@/lib/prisma";
import type { AccessScope } from "@/server/context";
import { categoryExistsInScope } from "@/server/services/categories";
import { buildFxRateLookup, convertAmountMinor } from "@/server/services/fx-conversion";
import { calculateNextDueDateOnMarkPaid } from "@/server/services/recurrence";
import type { EarlyPaymentDecision, RecurrenceRule, RecurrenceUnit } from "@/types/recurrence";

export type PaymentType = "subscription" | "bill";
export type PaymentListFilter = "all" | "subscription" | "bill" | "stopped";

export type PaymentCategorySummary = {
  id: string;
  name: string;
  color: string;
};

export type PaymentRecord = {
  id: string;
  ownerType: string;
  ownerId: string;
  title: string;
  paymentType: string;
  amountMinor: number;
  currency: string;
  nextDueDate: Date;
  recurrenceInterval: number;
  recurrenceUnit: string;
  categoryId: string | null;
  note: string | null;
  status: string;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  category?: PaymentCategorySummary | null;
};

export type PaymentHistoryRecord = {
  id: string;
  paymentId: string;
  paidAt: Date;
  paidAmountMinor: number;
  currency: string;
  createdByUserId: string;
  scheduleAction: string;
  note: string | null;
  createdAt: Date;
};

export type PaymentReminderRecord = {
  id: string;
  paymentId: string;
  offsetDays: number;
  createdAt: Date;
};

export type PaymentWithHistory = PaymentRecord & {
  history: PaymentHistoryRecord[];
  reminders: PaymentReminderRecord[];
};

export type PaymentInput = {
  title: string;
  paymentType: PaymentType;
  amountMinor: number;
  currency: string;
  nextDueDate: Date;
  recurrenceInterval: number;
  recurrenceUnit: RecurrenceUnit;
  categoryId?: string;
  note?: string;
  reminderOffsets?: number[];
};

export type MarkPaidInput = {
  paidAt: Date;
  paidAmountMinor?: number;
  currency?: string;
  note?: string;
  earlyDecision?: EarlyPaymentDecision;
};

const REMINDER_OFFSET_OPTIONS = new Set([0, 1, 3, 7]);
const DEFAULT_REMINDER_OFFSETS = [1];
const DEFAULT_DISPLAY_CURRENCY = "USD";

export function parseIsoDateOnly(value: string): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("invalid date");
  }
  return parsed;
}

export function parseAmountToMinor(value: string): number {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("invalid amount");
  }

  return Math.round(Number(normalized) * 100);
}

export function formatMinorToAmount(value: number): string {
  return (value / 100).toFixed(2);
}

export async function listPayments(
  scope: AccessScope,
  filter: PaymentListFilter = "all",
): Promise<PaymentRecord[]> {
  const where =
    filter === "stopped"
      ? {
          ownerType: scope.ownerType,
          ownerId: scope.ownerId,
          status: "stopped",
        }
      : {
          ownerType: scope.ownerType,
          ownerId: scope.ownerId,
          status: "active",
          ...(filter === "all" ? {} : { paymentType: filter }),
        };

  const result = await prisma.payment.findMany({
    where,
    include: {
      category: {
        select: { id: true, name: true, color: true },
      },
    },
    orderBy: [{ nextDueDate: "asc" }, { createdAt: "desc" }],
  });

  return result as PaymentRecord[];
}

export async function stopPayment(scope: AccessScope, paymentId: string): Promise<{ count: number }> {
  return prisma.payment.updateMany({
    where: {
      id: paymentId,
      ownerType: scope.ownerType,
      ownerId: scope.ownerId,
      status: "active",
    },
    data: {
      status: "stopped",
    },
  });
}

export async function getPaymentById(scope: AccessScope, paymentId: string): Promise<PaymentWithHistory | null> {
  const result = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      ownerType: scope.ownerType,
      ownerId: scope.ownerId,
    },
    include: {
      category: {
        select: { id: true, name: true, color: true },
      },
      history: {
        orderBy: { paidAt: "desc" },
      },
      reminders: {
        orderBy: { offsetDays: "asc" },
      },
    },
  });

  return result as PaymentWithHistory | null;
}

export async function createPayment(scope: AccessScope, input: PaymentInput): Promise<PaymentRecord> {
  const categoryId = await resolveCategoryIdForWrite(scope, input.categoryId);
  const reminderOffsets = normalizeReminderOffsets(input.reminderOffsets);

  const result = await prisma.payment.create({
    data: {
      ownerType: scope.ownerType,
      ownerId: scope.ownerId,
      title: input.title,
      paymentType: input.paymentType,
      amountMinor: input.amountMinor,
      currency: input.currency,
      nextDueDate: input.nextDueDate,
      recurrenceInterval: input.recurrenceInterval,
      recurrenceUnit: input.recurrenceUnit,
      categoryId,
      note: input.note,
      status: "active",
      createdByUserId: scope.userId,
      reminders: {
        create: reminderOffsets.map((offsetDays) => ({ offsetDays })),
      },
    },
    include: {
      category: {
        select: { id: true, name: true, color: true },
      },
    },
  });

  return result as PaymentRecord;
}

export async function updatePayment(
  scope: AccessScope,
  paymentId: string,
  input: PaymentInput,
): Promise<{ count: number }> {
  const categoryId = await resolveCategoryIdForWrite(scope, input.categoryId);
  const reminderOffsets = normalizeReminderOffsets(input.reminderOffsets);

  const existing = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      ownerType: scope.ownerType,
      ownerId: scope.ownerId,
    },
    select: { id: true },
  });

  if (!existing) {
    return { count: 0 };
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: {
        title: input.title,
        paymentType: input.paymentType,
        amountMinor: input.amountMinor,
        currency: input.currency,
        nextDueDate: input.nextDueDate,
        recurrenceInterval: input.recurrenceInterval,
        recurrenceUnit: input.recurrenceUnit,
        categoryId,
        note: input.note,
      },
    }),
    prisma.paymentReminder.deleteMany({ where: { paymentId } }),
    prisma.paymentReminder.createMany({
      data: reminderOffsets.map((offsetDays) => ({ paymentId, offsetDays })),
    }),
  ]);

  return { count: 1 };
}

export async function markPaymentPaid(scope: AccessScope, paymentId: string, input: MarkPaidInput) {
  const payment = (await prisma.payment.findFirst({
    where: {
      id: paymentId,
      ownerType: scope.ownerType,
      ownerId: scope.ownerId,
    },
  })) as PaymentRecord | null;

  if (!payment) {
    throw new Error("payment not found");
  }

  if (payment.status !== "active") {
    throw new Error("payment is stopped");
  }

  const recurrence: RecurrenceRule = {
    interval: payment.recurrenceInterval,
    unit: payment.recurrenceUnit as RecurrenceUnit,
  };

  const effectiveEarlyDecision = isMoreThanOneDayEarly(input.paidAt, payment.nextDueDate)
    ? input.earlyDecision
    : undefined;

  const calculation = calculateNextDueDateOnMarkPaid({
    oldNextDueDate: payment.nextDueDate,
    paidAt: input.paidAt,
    recurrence,
    earlyDecision: effectiveEarlyDecision,
  });

  const paidAmountMinor = input.paidAmountMinor ?? payment.amountMinor;
  const paidCurrency = input.currency ?? payment.currency;

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        nextDueDate: calculation.newNextDueDate,
      },
    }),
    prisma.paymentHistory.create({
      data: {
        paymentId: payment.id,
        paidAt: input.paidAt,
        paidAmountMinor,
        currency: paidCurrency,
        createdByUserId: scope.userId,
        scheduleAction: calculation.scheduleAction,
        note: input.note,
      },
    }),
  ]);

  return calculation;
}

export async function getDashboardData(scope: AccessScope): Promise<{
  displayCurrency: string;
  dueThisMonthMinor: number;
  monthlyLoadMinor: number;
  upcoming: PaymentRecord[];
}> {
  const today = new Date();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));

  const [displayCurrency, dueThisMonthPayments, activePayments, upcoming] = await Promise.all([
    getUserDisplayCurrency(scope.userId),
    prisma.payment.findMany({
      where: {
        ownerType: scope.ownerType,
        ownerId: scope.ownerId,
        status: "active",
        nextDueDate: {
          gte: monthStart,
          lt: monthEnd,
        },
      },
      select: {
        amountMinor: true,
        currency: true,
      },
    }),
    prisma.payment.findMany({
      where: {
        ownerType: scope.ownerType,
        ownerId: scope.ownerId,
        status: "active",
      },
      include: {
        category: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: { nextDueDate: "asc" },
    }),
    prisma.payment.findMany({
      where: {
        ownerType: scope.ownerType,
        ownerId: scope.ownerId,
        status: "active",
        nextDueDate: {
          gte: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())),
        },
      },
      include: {
        category: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: { nextDueDate: "asc" },
      take: 5,
    }),
  ]);

  const fxLookup = await loadFxRateLookup(
    collectCurrenciesFromPayments(activePayments, displayCurrency),
  );

  const activePaymentsTyped = activePayments as PaymentRecord[];

  const dueThisMonthMinor = dueThisMonthPayments.reduce(
    (sum, payment) =>
      sum + convertAmountMinor(payment.amountMinor, payment.currency, displayCurrency, fxLookup),
    0,
  );

  const monthlyLoadMinor = Math.round(
    activePaymentsTyped.reduce((sum, payment) => {
      const monthlyMultiplier = getMonthlyMultiplier(
        payment.recurrenceInterval,
        payment.recurrenceUnit as RecurrenceUnit,
      );
      const convertedMinor = convertAmountMinor(payment.amountMinor, payment.currency, displayCurrency, fxLookup);
      return sum + convertedMinor * monthlyMultiplier;
    }, 0),
  );

  return {
    displayCurrency,
    dueThisMonthMinor,
    monthlyLoadMinor,
    upcoming: upcoming as PaymentRecord[],
  };
}

export async function getCalendarData(scope: AccessScope, year: number, month: number): Promise<PaymentRecord[]> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const result = await prisma.payment.findMany({
    where: {
      ownerType: scope.ownerType,
      ownerId: scope.ownerId,
      status: "active",
      nextDueDate: {
        gte: start,
        lt: end,
      },
    },
    include: {
      category: {
        select: { id: true, name: true, color: true },
      },
    },
    orderBy: [{ nextDueDate: "asc" }, { title: "asc" }],
  });

  return result as PaymentRecord[];
}

export async function getAnalyticsData(scope: AccessScope): Promise<{
  displayCurrency: string;
  totalCount: number;
  totalAmountMinor: number;
  next30Count: number;
  next30AmountMinor: number;
  yearCount: number;
  yearAmountMinor: number;
  byType: Array<{ paymentType: string; count: number; amountMinor: number }>;
  byCategory: Array<{ categoryId: string | null; categoryName: string; count: number; amountMinor: number }>;
  mostExpensive: Array<{
    id: string;
    title: string;
    paymentType: string;
    amountMinor: number;
    currency: string;
    nextDueDate: Date;
  }>;
}> {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const plus30 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 30));
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const nextYearStart = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));

  const [displayCurrency, payments] = await Promise.all([
    getUserDisplayCurrency(scope.userId),
    prisma.payment.findMany({
      where: {
        ownerType: scope.ownerType,
        ownerId: scope.ownerId,
        status: "active",
      },
      select: {
        id: true,
        title: true,
        paymentType: true,
        amountMinor: true,
        currency: true,
        nextDueDate: true,
        categoryId: true,
      },
    }),
  ]);

  const fxLookup = await loadFxRateLookup(
    collectCurrenciesFromPayments(payments, displayCurrency),
  );

  const withConvertedAmount = payments.map((payment) => ({
    ...payment,
    convertedMinor: convertAmountMinor(payment.amountMinor, payment.currency, displayCurrency, fxLookup),
  }));

  const next30Payments = withConvertedAmount.filter(
    (payment) => payment.nextDueDate >= todayStart && payment.nextDueDate <= plus30,
  );
  const yearPayments = withConvertedAmount.filter(
    (payment) => payment.nextDueDate >= yearStart && payment.nextDueDate < nextYearStart,
  );

  const groupedByTypeMap = new Map<string, { count: number; amountMinor: number }>();
  for (const payment of withConvertedAmount) {
    const existing = groupedByTypeMap.get(payment.paymentType);
    if (existing) {
      existing.count += 1;
      existing.amountMinor += payment.convertedMinor;
      continue;
    }

    groupedByTypeMap.set(payment.paymentType, {
      count: 1,
      amountMinor: payment.convertedMinor,
    });
  }

  const groupedByCategoryMap = new Map<string | null, { count: number; amountMinor: number }>();
  for (const payment of withConvertedAmount) {
    const existing = groupedByCategoryMap.get(payment.categoryId);
    if (existing) {
      existing.count += 1;
      existing.amountMinor += payment.convertedMinor;
      continue;
    }

    groupedByCategoryMap.set(payment.categoryId, {
      count: 1,
      amountMinor: payment.convertedMinor,
    });
  }

  const categoryIds = Array.from(groupedByCategoryMap.keys())
    .filter((item): item is string => Boolean(item));

  const categories =
    categoryIds.length === 0
      ? []
      : await prisma.category.findMany({
          where: {
            id: { in: categoryIds },
            ownerType: scope.ownerType,
            ownerId: scope.ownerId,
          },
          select: {
            id: true,
            name: true,
          },
        });

  const categoryNameMap = new Map(categories.map((item) => [item.id, item.name]));

  return {
    displayCurrency,
    totalCount: withConvertedAmount.length,
    totalAmountMinor: withConvertedAmount.reduce((sum, item) => sum + item.convertedMinor, 0),
    next30Count: next30Payments.length,
    next30AmountMinor: next30Payments.reduce((sum, item) => sum + item.convertedMinor, 0),
    yearCount: yearPayments.length,
    yearAmountMinor: yearPayments.reduce((sum, item) => sum + item.convertedMinor, 0),
    byType: Array.from(groupedByTypeMap.entries()).map(([paymentType, value]) => ({
      paymentType,
      count: value.count,
      amountMinor: value.amountMinor,
    })),
    byCategory: Array.from(groupedByCategoryMap.entries())
      .map(([categoryId, value]) => ({
        categoryId,
        categoryName: categoryId ? categoryNameMap.get(categoryId) ?? "Unknown" : "Uncategorized",
        count: value.count,
        amountMinor: value.amountMinor,
      }))
      .sort((a, b) => b.amountMinor - a.amountMinor),
    mostExpensive: withConvertedAmount
      .sort((a, b) => b.convertedMinor - a.convertedMinor || a.nextDueDate.getTime() - b.nextDueDate.getTime())
      .slice(0, 5)
      .map((item) => ({
      id: item.id,
      title: item.title,
      paymentType: item.paymentType,
      amountMinor: item.amountMinor,
      currency: item.currency,
      nextDueDate: item.nextDueDate,
      })),
  };
}

function normalizeReminderOffsets(offsets: number[] | undefined): number[] {
  const valid = Array.from(new Set((offsets ?? []).filter((offset) => REMINDER_OFFSET_OPTIONS.has(offset))));

  if (valid.length === 0) {
    return DEFAULT_REMINDER_OFFSETS;
  }

  return valid.sort((a, b) => a - b);
}

function isMoreThanOneDayEarly(paidAt: Date, dueDate: Date): boolean {
  const paidUtc = Date.UTC(paidAt.getUTCFullYear(), paidAt.getUTCMonth(), paidAt.getUTCDate());
  const dueUtc = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  const diffDays = (dueUtc - paidUtc) / (24 * 60 * 60 * 1000);
  return diffDays > 1;
}

function getMonthlyMultiplier(interval: number, unit: RecurrenceUnit): number {
  if (interval <= 0) {
    return 0;
  }

  switch (unit) {
    case "day":
      return 30 / interval;
    case "week":
      return 4.345 / interval;
    case "month":
      return 1 / interval;
    case "year":
      return 1 / (12 * interval);
    default:
      return 0;
  }
}

async function resolveCategoryIdForWrite(scope: AccessScope, categoryId?: string): Promise<string | null> {
  const normalized = categoryId?.trim();
  if (!normalized) {
    return null;
  }

  const allowed = await categoryExistsInScope(scope, normalized);
  if (!allowed) {
    throw new Error("invalid category");
  }

  return normalized;
}

type AmountWithCurrency = {
  amountMinor: number;
  currency: string;
};

function collectCurrenciesFromPayments(
  payments: AmountWithCurrency[],
  displayCurrency: string,
): string[] {
  const currencies = new Set<string>([displayCurrency.toUpperCase(), DEFAULT_DISPLAY_CURRENCY]);
  for (const payment of payments) {
    currencies.add(payment.currency.toUpperCase());
  }

  return Array.from(currencies);
}

async function loadFxRateLookup(currencies: string[]): Promise<Map<string, number>> {
  const normalized = Array.from(new Set(currencies.map((item) => item.trim().toUpperCase()).filter(Boolean)));
  if (normalized.length <= 1) {
    return new Map<string, number>();
  }

  const rates = await prisma.fxRate.findMany({
    where: {
      OR: [
        {
          baseCurrency: { in: normalized },
          quoteCurrency: { in: normalized },
        },
        {
          baseCurrency: DEFAULT_DISPLAY_CURRENCY,
          quoteCurrency: { in: normalized },
        },
        {
          baseCurrency: { in: normalized },
          quoteCurrency: DEFAULT_DISPLAY_CURRENCY,
        },
      ],
    },
    select: {
      baseCurrency: true,
      quoteCurrency: true,
      rate: true,
    },
  });

  return buildFxRateLookup(
    rates.map((item) => ({
      baseCurrency: item.baseCurrency,
      quoteCurrency: item.quoteCurrency,
      rate: Number(item.rate),
    })),
  );
}

async function getUserDisplayCurrency(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { primaryCurrency: true },
  });

  return user?.primaryCurrency?.toUpperCase() ?? DEFAULT_DISPLAY_CURRENCY;
}
