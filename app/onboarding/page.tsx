import { redirect } from "next/navigation";
import { NotificationPermissionField } from "@/components/notification-permission";
import { requireUserId } from "@/server/auth";
import { getUserSettings, isUserOnboardingComplete } from "@/server/services/settings";
import { completeOnboardingAction } from "./actions";

export const dynamic = "force-dynamic";

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "RUB", "JPY"];
const TIMEZONE_OPTIONS = [
  "UTC",
  "Europe/Berlin",
  "Europe/Moscow",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Tokyo",
];

export default async function OnboardingPage() {
  const userId = await requireUserId();
  const completed = await isUserOnboardingComplete(userId);

  if (completed) {
    redirect("/");
  }

  const settings = await getUserSettings(userId);

  return (
    <section className="page-stack space-y-4">
      <div className="soft-card overflow-hidden">
        <div className="border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3">
          <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">First Run</div>
          <h1 className="text-xl font-bold text-[var(--ink)]">Welcome to Billora</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Set baseline preferences to start reminders and tracking.</p>
        </div>

        <form action={completeOnboardingAction} className="space-y-4 p-4 text-sm">
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Primary Currency</span>
            <select name="primaryCurrency" defaultValue={settings.primaryCurrency} className="field-base">
              {CURRENCY_OPTIONS.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Timezone</span>
            <select name="timezone" defaultValue={settings.timezone} className="field-base">
              {!TIMEZONE_OPTIONS.includes(settings.timezone) ? (
                <option value={settings.timezone}>{settings.timezone}</option>
              ) : null}
              {TIMEZONE_OPTIONS.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Reminder Time</span>
            <input
              type="time"
              name="preferredReminderTime"
              defaultValue={settings.preferredReminderTime}
              className="field-base"
            />
          </label>

          <label className="list-item flex cursor-pointer items-center justify-between gap-3 px-3 py-2">
            <div>
              <div className="font-semibold text-[var(--ink)]">Enable Notifications</div>
              <div className="text-xs text-[var(--muted)]">Used for browser push and in-app reminder status.</div>
            </div>
            <input type="checkbox" name="notificationsEnabled" defaultChecked={settings.notificationsEnabled} className="h-4 w-4" />
          </label>

          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
            <div className="text-sm font-semibold text-[var(--ink)]">Browser Permission</div>
            <div className="mt-1 text-xs text-[var(--muted)]">Grant permission now to allow push delivery when enabled.</div>
            <div className="mt-2">
              <NotificationPermissionField />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full">
            Complete Setup
          </button>
        </form>
      </div>
    </section>
  );
}
