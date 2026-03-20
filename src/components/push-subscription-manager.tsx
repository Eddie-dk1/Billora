"use client";

import { useEffect, useMemo, useState } from "react";

type SupportState = "checking" | "supported" | "unsupported";

function urlBase64ToArrayBuffer(value: string): ArrayBuffer {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const output = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    output[i] = binary.charCodeAt(i);
  }
  return output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
}

export function PushSubscriptionManager() {
  const [supportState, setSupportState] = useState<SupportState>("checking");
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string>("");
  const vapidPublicKey = useMemo(() => process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "", []);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    if (!supported) {
      setSupportState("unsupported");
      return;
    }

    setSupportState("supported");
    setPermission(Notification.permission);

    void (async () => {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      setIsSubscribed(Boolean(existing));
    })();
  }, []);

  async function subscribe(): Promise<void> {
    if (supportState !== "supported" || !vapidPublicKey) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const requestedPermission = await Notification.requestPermission();
      setPermission(requestedPermission);
      if (requestedPermission !== "granted") {
        setMessage("Browser permission denied.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToArrayBuffer(vapidPublicKey),
        }));

      await fetch("/api/push/subscription", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(subscription),
      });

      setIsSubscribed(true);
      setMessage("Push subscription connected.");
    } catch {
      setMessage("Failed to subscribe for push notifications.");
    } finally {
      setIsBusy(false);
    }
  }

  async function unsubscribe(): Promise<void> {
    if (supportState !== "supported") {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await fetch("/api/push/subscription", {
          method: "DELETE",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        await existing.unsubscribe();
      }
      setIsSubscribed(false);
      setMessage("Push subscription disconnected.");
    } catch {
      setMessage("Failed to unsubscribe push notifications.");
    } finally {
      setIsBusy(false);
    }
  }

  if (supportState === "unsupported") {
    return (
      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-xs text-[var(--muted)]">
        Browser push is not supported on this device. In-app reminders remain available.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-sm">
      <div className="font-semibold text-[var(--ink)]">Browser Push Subscription</div>
      <div className="mt-1 text-xs text-[var(--muted)]">
        Permission: {permission}. Subscription: {isSubscribed ? "active" : "inactive"}.
      </div>
      {!vapidPublicKey ? (
        <div className="mt-2 text-xs text-[var(--danger)]">
          Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY. Add VAPID keys to enable push transport.
        </div>
      ) : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={subscribe}
          disabled={isBusy || !vapidPublicKey}
          className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Connect
        </button>
        <button
          type="button"
          onClick={unsubscribe}
          disabled={isBusy || !isSubscribed}
          className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Disconnect
        </button>
      </div>
      {message ? <div className="mt-2 text-xs text-[var(--muted)]">{message}</div> : null}
    </div>
  );
}
