import { InviteShare } from "@/components/invite-share";
import { ContextSwitcherShell } from "@/components/context-switcher-shell";
import { PushSubscriptionManager } from "@/components/push-subscription-manager";
import { formatDate } from "@/lib/presenters";
import { requireOnboardedUserId } from "@/server/auth";
import { resolveAccessScopeForUser, resolveContextFromSearchParams, type SearchParamsLike } from "@/server/context";
import { listCategories } from "@/server/services/categories";
import { listSharedAccountMembers, listSharedAccountsForUser } from "@/server/services/shared-accounts";
import { getUserSettings } from "@/server/services/settings";
import {
  createCategoryAction,
  createSharedAccountAction,
  deleteCategoryAction,
  joinSharedAccountAction,
  leaveSharedAccountAction,
  removeSharedMemberAction,
  saveSettingsAction,
  switchSharedAccountAction,
  updateCategoryAction,
} from "./actions";

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

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsLike>;
}) {
  const userId = await requireOnboardedUserId();
  const resolvedParams = await searchParams;
  const requestedContext = resolveContextFromSearchParams(resolvedParams);
  const scope = await resolveAccessScopeForUser(userId, requestedContext, { fallbackToPersonal: true });

  const [settings, categories, sharedAccounts] = await Promise.all([
    getUserSettings(userId),
    listCategories(scope),
    listSharedAccountsForUser(userId),
  ]);

  const requestedSharedId = Array.isArray(resolvedParams.sharedId)
    ? resolvedParams.sharedId[0]
    : resolvedParams.sharedId;

  const selectedSharedId =
    requestedSharedId && sharedAccounts.some((account) => account.id === requestedSharedId)
      ? requestedSharedId
      : sharedAccounts[0]?.id;

  const selectedAccount = sharedAccounts.find((item) => item.id === selectedSharedId);

  const joinSharedId = Array.isArray(resolvedParams.joinSharedId)
    ? resolvedParams.joinSharedId[0]
    : resolvedParams.joinSharedId;

  const joinErrorRaw = Array.isArray(resolvedParams.joinError)
    ? resolvedParams.joinError[0]
    : resolvedParams.joinError;

  const joinErrorMessage =
    joinErrorRaw === "not_found"
      ? "Shared account not found. Check the ID and try again."
      : joinErrorRaw === "invalid_id"
        ? "Invalid shared account ID."
        : null;

  const members = selectedSharedId ? await listSharedAccountMembers(userId, selectedSharedId) : [];

  return (
    <section className="page-stack space-y-4">
      <div className="soft-card overflow-hidden">
        <div className="border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Preferences</div>
              <h1 className="text-xl font-bold text-[var(--ink)]">Settings</h1>
            </div>
            <ContextSwitcherShell />
          </div>
        </div>

        <form action={saveSettingsAction} className="space-y-4 p-4 text-sm">
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
              <div className="font-semibold text-[var(--ink)]">Push Notifications</div>
              <div className="text-xs text-[var(--muted)]">Browser push is primary channel, in-app reminders are fallback.</div>
            </div>
            <input
              type="checkbox"
              name="notificationsEnabled"
              defaultChecked={settings.notificationsEnabled}
              className="h-4 w-4"
            />
          </label>

          <PushSubscriptionManager />

          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-xs text-[var(--muted)]">
            Shared editing mode: last write wins. FX analytics use current rates (as-of-now).
          </div>

          <button type="submit" className="btn-primary w-full">
            Save Settings
          </button>
        </form>
      </div>

      <div className="soft-card p-4">
        <h2 className="text-lg font-bold text-[var(--ink)]">Shared Accounts</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Create or join shared contexts and manage members.</p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <form action={createSharedAccountAction} className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
            <div className="text-sm font-semibold text-[var(--ink)]">Create shared account</div>
            <input name="name" required maxLength={80} className="field-input" placeholder="Family budget" />
            <button type="submit" className="btn-primary w-full">
              Create
            </button>
          </form>

          <form action={joinSharedAccountAction} className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
            <div className="text-sm font-semibold text-[var(--ink)]">Join by account ID</div>
            <input
              name="sharedAccountId"
              required
              className="field-input"
              placeholder="cuid account id"
              defaultValue={joinSharedId ?? ""}
            />
            {joinErrorMessage ? <div className="text-xs font-semibold text-[var(--danger)]">{joinErrorMessage}</div> : null}
            <button type="submit" className="btn-secondary w-full">
              Join
            </button>
          </form>
        </div>

        {sharedAccounts.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
            You are not a member of any shared account yet.
          </div>
        ) : (
          <>
            {sharedAccounts.length > 1 ? (
              <form action={switchSharedAccountAction} className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
                <div className="text-sm font-semibold text-[var(--ink)]">Select active shared account</div>
                <div className="mt-2 flex gap-2">
                  <select name="sharedAccountId" defaultValue={selectedSharedId} className="field-select">
                    {sharedAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.membersCount} members)
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="btn-secondary whitespace-nowrap">
                    Use
                  </button>
                </div>
              </form>
            ) : null}

            <ul className="mt-4 space-y-2">
              {sharedAccounts.map((account) => (
                <li key={account.id} className="list-item p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-[var(--ink)]">{account.name}</div>
                      <div className="text-xs text-[var(--muted)]">
                        ID: {account.id} | {account.membersCount} members | Joined {formatDate(account.joinedAt)}
                      </div>
                    </div>
                    <div className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                      {account.isOwner ? "owner" : "member"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {selectedSharedId ? <div className="mt-4"><InviteShare sharedAccountId={selectedSharedId} /></div> : null}

        {selectedAccount && !selectedAccount.isOwner ? (
          <form action={leaveSharedAccountAction} className="mt-3 flex justify-end">
            <input type="hidden" name="sharedAccountId" value={selectedAccount.id} />
            <button type="submit" className="btn-danger-subtle">
              Leave shared account
            </button>
          </form>
        ) : null}

        {members.length > 0 ? (
          <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
            <div className="text-sm font-semibold text-[var(--ink)]">Members ({members.length})</div>
            <ul className="mt-2 space-y-2 text-sm">
              {members.map((member) => (
                <li key={member.userId} className="list-item flex items-center justify-between gap-2 px-3 py-2">
                  <div>
                    <div className="text-[var(--ink)]">
                      {member.name}
                      {member.isOwner ? (
                        <span className="ml-2 rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                          owner
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-[var(--muted)]">{member.email}</div>
                  </div>
                  {selectedAccount?.isOwner && !member.isOwner ? (
                    <form action={removeSharedMemberAction}>
                      <input type="hidden" name="sharedAccountId" value={selectedSharedId} />
                      <input type="hidden" name="memberUserId" value={member.userId} />
                      <button type="submit" className="btn-danger-subtle">
                        Remove
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="soft-card p-4">
        <h2 className="text-lg font-bold text-[var(--ink)]">Categories ({scope.context})</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Categories are scoped to the active context.</p>

        <form action={createCategoryAction} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <input type="hidden" name="context" value={scope.context} />
          <input name="name" required maxLength={40} className="field-input sm:col-span-2" placeholder="New category" />
          <input
            type="color"
            name="color"
            defaultValue="#1f4ec9"
            className="h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2"
          />
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>

        {categories.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
            No categories yet for this context.
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {categories.map((category) => (
              <li key={category.id} className="list-item p-3">
                <form action={updateCategoryAction} className="grid grid-cols-1 gap-2 sm:grid-cols-6">
                  <input type="hidden" name="context" value={scope.context} />
                  <input type="hidden" name="categoryId" value={category.id} />
                  <input name="name" defaultValue={category.name} required maxLength={40} className="field-input sm:col-span-3" />
                  <input
                    type="color"
                    name="color"
                    defaultValue={category.color}
                    className="h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2"
                  />
                  <button type="submit" className="btn-secondary">
                    Save
                  </button>
                </form>

                <form action={deleteCategoryAction} className="mt-2 flex justify-end">
                  <input type="hidden" name="context" value={scope.context} />
                  <input type="hidden" name="categoryId" value={category.id} />
                  <button type="submit" className="btn-danger-subtle">
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
