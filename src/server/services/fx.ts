import { prisma } from "@/lib/prisma";

type FxSyncResult = {
  baseCurrency: string;
  fetchedAt: string;
  requestedQuotes: number;
  savedRates: number;
  fallbackRates: number;
  missingRates: string[];
  usedFallback: boolean;
};

type FxApiPayload = {
  success?: boolean;
  base?: string;
  date?: string;
  rates?: Record<string, number>;
};

const DEFAULT_BASE_CURRENCY = "USD";
const FX_API_BASE_URL = process.env.FX_API_BASE_URL ?? "https://api.exchangerate.host/latest";

export async function runFxSyncJob(baseCurrency = DEFAULT_BASE_CURRENCY): Promise<FxSyncResult> {
  const normalizedBase = baseCurrency.trim().toUpperCase();
  const currencies = await collectTrackedCurrencies(normalizedBase);

  if (currencies.length === 0) {
    return {
      baseCurrency: normalizedBase,
      fetchedAt: new Date().toISOString(),
      requestedQuotes: 0,
      savedRates: 0,
      fallbackRates: 0,
      missingRates: [],
      usedFallback: false,
    };
  }

  const fetchedAt = new Date();
  const payload = await fetchRates(normalizedBase, currencies);

  let savedRates = 0;
  let fallbackRates = 0;
  const missingRates: string[] = [];

  for (const quoteCurrency of currencies) {
    const rate = payload?.rates?.[quoteCurrency];

    if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
      await upsertRate(normalizedBase, quoteCurrency, rate, fetchedAt);
      savedRates += 1;
      continue;
    }

    const latestStored = await prisma.fxRate.findUnique({
      where: {
        baseCurrency_quoteCurrency: {
          baseCurrency: normalizedBase,
          quoteCurrency,
        },
      },
      select: { rate: true, fetchedAt: true },
    });

    if (latestStored) {
      await upsertRate(
        normalizedBase,
        quoteCurrency,
        Number(latestStored.rate),
        latestStored.fetchedAt,
      );
      fallbackRates += 1;
      continue;
    }

    missingRates.push(quoteCurrency);
  }

  if (!payload) {
    console.error("[fx-sync] exchangerate.host unavailable, fallback used where possible");
  }

  return {
    baseCurrency: normalizedBase,
    fetchedAt: fetchedAt.toISOString(),
    requestedQuotes: currencies.length,
    savedRates,
    fallbackRates,
    missingRates,
    usedFallback: !payload,
  };
}

async function fetchRates(base: string, quotes: string[]): Promise<FxApiPayload | null> {
  const symbols = quotes.join(",");
  const url = `${FX_API_BASE_URL}?base=${base}&symbols=${symbols}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as FxApiPayload;
    if (!payload || !payload.rates) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error("[fx-sync] request failed", error);
    return null;
  }
}

async function upsertRate(
  baseCurrency: string,
  quoteCurrency: string,
  rate: number,
  fetchedAt: Date,
): Promise<void> {
  await prisma.fxRate.upsert({
    where: {
      baseCurrency_quoteCurrency: {
        baseCurrency,
        quoteCurrency,
      },
    },
    create: {
      baseCurrency,
      quoteCurrency,
      rate,
      fetchedAt,
    },
    update: {
      rate,
      fetchedAt,
    },
  });
}

async function collectTrackedCurrencies(baseCurrency: string): Promise<string[]> {
  const [paymentCurrencies, userCurrencies] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "active" },
      select: { currency: true },
      distinct: ["currency"],
    }),
    prisma.user.findMany({
      select: { primaryCurrency: true },
      distinct: ["primaryCurrency"],
    }),
  ]);

  const unique = new Set<string>();
  for (const item of paymentCurrencies) {
    unique.add(item.currency.toUpperCase());
  }
  for (const item of userCurrencies) {
    unique.add(item.primaryCurrency.toUpperCase());
  }

  unique.delete(baseCurrency);

  return Array.from(unique).sort();
}
