import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as scryptCallback } from "crypto";
import { promisify } from "util";

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback);

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64")}$${Buffer.from(derivedKey).toString("base64")}`;
}

async function main() {
  const now = new Date();
  const demoPasswordHash = await hashPassword("DemoPass123!");

  await prisma.user.upsert({
    where: { email: "demo@billora.app" },
    update: {
      name: "Demo User",
      timezone: "UTC",
      primaryCurrency: "USD",
      activeContextType: "personal",
      activeContextId: null,
      passwordHash: demoPasswordHash,
    },
    create: {
      id: "dev-user",
      email: "demo@billora.app",
      name: "Demo User",
      timezone: "UTC",
      primaryCurrency: "USD",
      activeContextType: "personal",
      activeContextId: null,
      passwordHash: demoPasswordHash,
    },
  });

  await prisma.sharedAccount.upsert({
    where: { id: "dev-shared" },
    update: {
      name: "Family Budget",
      createdByUserId: "dev-user",
    },
    create: {
      id: "dev-shared",
      name: "Family Budget",
      createdByUserId: "dev-user",
    },
  });

  await prisma.sharedAccountMember.upsert({
    where: { sharedAccountId_userId: { sharedAccountId: "dev-shared", userId: "dev-user" } },
    update: {},
    create: {
      sharedAccountId: "dev-shared",
      userId: "dev-user",
    },
  });

  await prisma.payment.deleteMany({
    where: {
      OR: [
        { ownerType: "personal", ownerId: "dev-user" },
        { ownerType: "shared", ownerId: "dev-shared" },
      ],
    },
  });

  await prisma.category.deleteMany({
    where: {
      OR: [
        { ownerType: "personal", ownerId: "dev-user" },
        { ownerType: "shared", ownerId: "dev-shared" },
      ],
    },
  });

  const personalCategoryNames = ["Housing", "Utilities", "Streaming"];
  const sharedCategoryNames = ["Home", "Entertainment", "Insurance"];

  for (const name of personalCategoryNames) {
    await prisma.category.create({
      data: {
        ownerType: "personal",
        ownerId: "dev-user",
        name,
        createdByUserId: "dev-user",
      },
    });
  }

  for (const name of sharedCategoryNames) {
    await prisma.category.create({
      data: {
        ownerType: "shared",
        ownerId: "dev-shared",
        name,
        createdByUserId: "dev-user",
      },
    });
  }

  const personalCategories = await prisma.category.findMany({
    where: { ownerType: "personal", ownerId: "dev-user" },
  });
  const sharedCategories = await prisma.category.findMany({
    where: { ownerType: "shared", ownerId: "dev-shared" },
  });

  const personalByName = Object.fromEntries(personalCategories.map((item) => [item.name, item.id]));
  const sharedByName = Object.fromEntries(sharedCategories.map((item) => [item.name, item.id]));

  const personalPayments = [
    {
      ownerType: "personal",
      ownerId: "dev-user",
      title: "Netflix",
      paymentType: "subscription",
      amountMinor: 1599,
      currency: "USD",
      nextDueDate: addDays(now, 2),
      recurrenceInterval: 1,
      recurrenceUnit: "month",
      status: "active",
      createdByUserId: "dev-user",
      note: "Standard plan",
      categoryId: personalByName.Streaming,
    },
    {
      ownerType: "personal",
      ownerId: "dev-user",
      title: "iCloud",
      paymentType: "subscription",
      amountMinor: 299,
      currency: "USD",
      nextDueDate: addDays(now, 7),
      recurrenceInterval: 1,
      recurrenceUnit: "month",
      status: "active",
      createdByUserId: "dev-user",
      note: "200GB",
      categoryId: personalByName.Utilities,
    },
    {
      ownerType: "personal",
      ownerId: "dev-user",
      title: "Rent",
      paymentType: "bill",
      amountMinor: 125000,
      currency: "USD",
      nextDueDate: addDays(now, 4),
      recurrenceInterval: 1,
      recurrenceUnit: "month",
      status: "active",
      createdByUserId: "dev-user",
      note: "Apartment",
      categoryId: personalByName.Housing,
    },
  ];

  const sharedPayments = [
    {
      ownerType: "shared",
      ownerId: "dev-shared",
      title: "Internet",
      paymentType: "bill",
      amountMinor: 5500,
      currency: "USD",
      nextDueDate: addDays(now, 3),
      recurrenceInterval: 1,
      recurrenceUnit: "month",
      status: "active",
      createdByUserId: "dev-user",
      note: "Home Wi-Fi",
      categoryId: sharedByName.Home,
    },
    {
      ownerType: "shared",
      ownerId: "dev-shared",
      title: "Spotify Family",
      paymentType: "subscription",
      amountMinor: 1699,
      currency: "USD",
      nextDueDate: addDays(now, 5),
      recurrenceInterval: 1,
      recurrenceUnit: "month",
      status: "active",
      createdByUserId: "dev-user",
      note: "Shared plan",
      categoryId: sharedByName.Entertainment,
    },
    {
      ownerType: "shared",
      ownerId: "dev-shared",
      title: "Insurance",
      paymentType: "bill",
      amountMinor: 21000,
      currency: "USD",
      nextDueDate: addDays(now, 10),
      recurrenceInterval: 1,
      recurrenceUnit: "month",
      status: "active",
      note: "Car insurance",
      createdByUserId: "dev-user",
      categoryId: sharedByName.Insurance,
    },
  ];

  await prisma.payment.createMany({ data: [...personalPayments, ...sharedPayments] });

  const rent = await prisma.payment.findFirst({
    where: {
      ownerType: "personal",
      ownerId: "dev-user",
      title: "Rent",
    },
  });

  if (rent) {
    await prisma.paymentHistory.create({
      data: {
        paymentId: rent.id,
        paidAt: addDays(now, -25),
        paidAmountMinor: rent.amountMinor,
        currency: rent.currency,
        createdByUserId: "dev-user",
        scheduleAction: "on_time",
        note: "Previous month",
      },
    });
  }

  console.log("Seed completed: demo personal/shared payments and categories created.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
