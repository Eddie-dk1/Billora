type FxRateRow = {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
};

const DEFAULT_BASE_CURRENCY = "USD";

function pairKey(baseCurrency: string, quoteCurrency: string): string {
  return `${baseCurrency}->${quoteCurrency}`;
}

export function buildFxRateLookup(rates: FxRateRow[]): Map<string, number> {
  const lookup = new Map<string, number>();

  for (const rate of rates) {
    const base = rate.baseCurrency.trim().toUpperCase();
    const quote = rate.quoteCurrency.trim().toUpperCase();
    if (!base || !quote || !Number.isFinite(rate.rate) || rate.rate <= 0) {
      continue;
    }

    lookup.set(pairKey(base, quote), rate.rate);
  }

  return lookup;
}

function getDirectRate(fromCurrency: string, toCurrency: string, lookup: Map<string, number>): number | null {
  const direct = lookup.get(pairKey(fromCurrency, toCurrency));
  if (typeof direct === "number" && Number.isFinite(direct) && direct > 0) {
    return direct;
  }

  const inverse = lookup.get(pairKey(toCurrency, fromCurrency));
  if (typeof inverse === "number" && Number.isFinite(inverse) && inverse > 0) {
    return 1 / inverse;
  }

  return null;
}

export function resolveConversionRate(
  fromCurrency: string,
  toCurrency: string,
  lookup: Map<string, number>,
): number | null {
  const from = fromCurrency.trim().toUpperCase();
  const to = toCurrency.trim().toUpperCase();

  if (!from || !to) {
    return null;
  }

  if (from === to) {
    return 1;
  }

  const direct = getDirectRate(from, to, lookup);
  if (direct) {
    return direct;
  }

  const fromToUsd = from === DEFAULT_BASE_CURRENCY
    ? 1
    : getDirectRate(from, DEFAULT_BASE_CURRENCY, lookup);
  const usdToTarget = to === DEFAULT_BASE_CURRENCY
    ? 1
    : getDirectRate(DEFAULT_BASE_CURRENCY, to, lookup);

  if (!fromToUsd || !usdToTarget) {
    return null;
  }

  return fromToUsd * usdToTarget;
}

export function convertAmountMinor(
  amountMinor: number,
  fromCurrency: string,
  toCurrency: string,
  lookup: Map<string, number>,
): number {
  const rate = resolveConversionRate(fromCurrency, toCurrency, lookup);
  if (!rate) {
    return amountMinor;
  }

  return Math.round(amountMinor * rate);
}
