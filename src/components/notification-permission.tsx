"use client";

import { useState } from "react";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

function readPermission(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

export function NotificationPermissionField() {
  const [permission, setPermission] = useState<PermissionState>(() => readPermission());

  async function requestPermission(): Promise<void> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="notificationPermission" value={permission} />
      <div className="text-xs text-[var(--muted)]">
        Browser status: <span className="font-semibold text-[var(--ink)]">{permission}</span>
      </div>
      <button
        type="button"
        className="btn-secondary"
        onClick={requestPermission}
        disabled={permission === "granted" || permission === "unsupported"}
      >
        {permission === "granted" ? "Permission granted" : "Request browser permission"}
      </button>
      {permission === "denied" ? (
        <div className="text-xs text-[var(--warning)]">
          Browser notifications are blocked. In-app reminders will still work.
        </div>
      ) : null}
    </div>
  );
}
