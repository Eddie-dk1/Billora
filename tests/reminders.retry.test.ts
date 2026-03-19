import { describe, expect, it } from "vitest";
import { shouldAttemptPushRetry } from "@/server/services/reminders";

describe("shouldAttemptPushRetry", () => {
  it("allows first attempt when there was no previous attempt timestamp", () => {
    const runAt = new Date("2026-03-20T10:00:00.000Z");
    expect(shouldAttemptPushRetry(runAt, 0, null)).toBe(true);
  });

  it("blocks retry until backoff time passes", () => {
    const lastAttemptAt = new Date("2026-03-20T10:00:00.000Z");
    const earlyRunAt = new Date("2026-03-20T10:03:00.000Z");
    const lateRunAt = new Date("2026-03-20T10:05:00.000Z");

    expect(shouldAttemptPushRetry(earlyRunAt, 1, lastAttemptAt)).toBe(false);
    expect(shouldAttemptPushRetry(lateRunAt, 1, lastAttemptAt)).toBe(true);
  });

  it("stops retrying after max attempts", () => {
    const runAt = new Date("2026-03-20T10:40:00.000Z");
    const lastAttemptAt = new Date("2026-03-20T10:00:00.000Z");
    expect(shouldAttemptPushRetry(runAt, 3, lastAttemptAt)).toBe(false);
  });
});
