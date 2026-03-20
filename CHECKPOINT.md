# CHECKPOINT

## Current Status
- MVP is on `Next.js 16 + TypeScript + App Router + Prisma + PostgreSQL`.
- Completed modules:
  - dashboard;
  - payments CRUD + mark-as-paid + history;
  - reminders center;
  - settings + categories;
  - analytics completion (yearly total + most expensive payments);
  - FX conversion in dashboard/analytics totals (user primary currency + FxRate fallback path);
  - jobs endpoints.
- Completed foundation:
  - credentials auth + session user id;
  - context resolution (personal/shared);
  - ownership/membership checks;
  - shared account create/join/list;
  - onboarding enforcement.
- Notifications groundwork updated:
  - push lifecycle statuses aligned to `pending/sent/failed/skipped`;
  - retry policy with backoff + max attempts wired into reminders job.
- Notifications completion done:
  - browser push subscription API (`POST/DELETE /api/push/subscription`);
  - per-user `PushSubscription` storage in Prisma;
  - real `web-push` delivery path from `pending` to `sent` (with unsubscribe/config skip handling);
  - settings UI + service worker registration for browser push.
- UX polish complete:
  - sign-out flow + callback redirect reasons;
  - invite/share UX;
  - active shared-account selection;
  - member permission actions.
- Quality checks are green:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`

## Where We Stopped
- We stopped after **Notifications completion** and infra recovery.
- Environment was validated as healthy before shutdown:
  - Docker Engine running;
  - DB container healthy on `5432`;
  - app responded on `http://localhost:3000` and `/api/health` with `200`.
- Current requested state: all local runtime processes stopped.

## Remaining Work (Priority Order)
1. Scheduler integration:
   - cron/QStash integration for `jobs/fx` and `jobs/reminders`.
2. Overdue lifecycle:
   - daily overdue check;
   - follow-up reminders;
   - overdue UX.
3. i18n prep:
   - extract text layer;
   - localization-ready structure.
4. Testing expansion:
   - shared/security/api/reminders/fx/analytics coverage.
5. Production readiness:
   - final `.env`;
   - staging/prod migrations + seed;
   - monitoring/logging;
   - CI on PRs.
6. Final acceptance:
   - spec checklist;
   - manual QA journeys;
   - UI polish.

## Next Step
- Implement **Scheduler integration**.
