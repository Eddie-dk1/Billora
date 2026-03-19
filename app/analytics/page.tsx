import Link from "next/link";

import { ContextSwitcherShell } from "@/components/context-switcher-shell";
import { formatAmount, formatDate } from "@/lib/presenters";
import { requireOnboardedUserId } from "@/server/auth";
import { resolveAccessScopeForUser, resolveContextFromSearchParams, type SearchParamsLike } from "@/server/context";
import { getAnalyticsData } from "@/server/services/payments";

export const dynamic = "force-dynamic";

function typeBadge(type: string): string {
  if (type === "subscription") {
    return "bg-[#e8efff] text-[#1f4ec9]";
  }

  return "bg-[#fff4db] text-[#9a6a00]";
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsLike>;
}) {
  const userId = await requireOnboardedUserId();
  const requestedContext = resolveContextFromSearchParams(await searchParams);
  const scope = await resolveAccessScopeForUser(userId, requestedContext, { fallbackToPersonal: true });
  const analytics = await getAnalyticsData(scope);

  return (
    <section className="page-stack space-y-4">
      <div className="soft-card overflow-hidden">
        <div className="border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Insights</div>
              <h1 className="text-xl font-bold text-[var(--ink)]">Analytics</h1>
            </div>
            <ContextSwitcherShell />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-[linear-gradient(135deg,#1f4ec9_0%,#2a66e7_100%)] p-4 text-white shadow-lg">
            <div className="text-xs uppercase tracking-[0.12em] text-white/80">Active payments</div>
            <div className="mt-2 text-2xl font-bold">{analytics.totalCount}</div>
            <div className="text-sm text-white/85">{formatAmount(analytics.totalAmountMinor, "USD")}</div>
          </div>

          <div className="rounded-2xl bg-[linear-gradient(135deg,#1a7a4f_0%,#24a56d_100%)] p-4 text-white shadow-lg">
            <div className="text-xs uppercase tracking-[0.12em] text-white/80">Due next 30 days</div>
            <div className="mt-2 text-2xl font-bold">{analytics.next30Count}</div>
            <div className="text-sm text-white/85">{formatAmount(analytics.next30AmountMinor, "USD")}</div>
          </div>

          <div className="rounded-2xl bg-[linear-gradient(135deg,#8a3f16_0%,#c06024_100%)] p-4 text-white shadow-lg">
            <div className="text-xs uppercase tracking-[0.12em] text-white/80">Due this year</div>
            <div className="mt-2 text-2xl font-bold">{analytics.yearCount}</div>
            <div className="text-sm text-white/85">{formatAmount(analytics.yearAmountMinor, "USD")}</div>
          </div>
        </div>
      </div>

      <div className="soft-card p-4">
        <h2 className="mb-3 text-lg font-bold text-[var(--ink)]">Most expensive payments</h2>
        {analytics.mostExpensive.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
            No data yet.
          </div>
        ) : (
          <ul className="space-y-2 text-sm">
            {analytics.mostExpensive.map((item) => (
              <li key={item.id} className="list-item p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/payments/${item.id}?context=${scope.context}`} className="font-semibold text-[var(--ink)] underline-offset-4 hover:underline">
                        {item.title}
                      </Link>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${typeBadge(item.paymentType)}`}>
                        {item.paymentType}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--muted)]">Due {formatDate(item.nextDueDate)}</div>
                  </div>
                  <div className="font-bold text-[var(--ink)]">{formatAmount(item.amountMinor, item.currency)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="soft-card p-4">
        <h2 className="mb-3 text-lg font-bold text-[var(--ink)]">By type</h2>
        {analytics.byType.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
            No data yet.
          </div>
        ) : (
          <ul className="space-y-2 text-sm">
            {analytics.byType.map((item) => (
              <li key={item.paymentType} className="list-item p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${typeBadge(item.paymentType)}`}
                    >
                      {item.paymentType}
                    </span>
                    <span className="text-sm text-[var(--muted)]">{item.count} payments</span>
                  </div>
                  <div className="font-bold text-[var(--ink)]">{formatAmount(item.amountMinor, "USD")}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="soft-card p-4">
        <h2 className="mb-3 text-lg font-bold text-[var(--ink)]">By category</h2>
        {analytics.byCategory.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
            No category data yet.
          </div>
        ) : (
          <ul className="space-y-2 text-sm">
            {analytics.byCategory.map((item) => (
              <li key={item.categoryId ?? "uncategorized"} className="list-item p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-[var(--ink)]">{item.categoryName}</div>
                  <div className="text-right">
                    <div className="font-bold text-[var(--ink)]">{formatAmount(item.amountMinor, "USD")}</div>
                    <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--muted)]">{item.count} items</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}