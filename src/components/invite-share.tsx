"use client";

import { useState } from "react";

export function InviteShare({ sharedAccountId }: { sharedAccountId: string }) {
  const [copied, setCopied] = useState(false);

  async function copyInvite(): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    const inviteLink = `${window.location.origin}/settings?context=shared&joinSharedId=${sharedAccountId}`;
    const inviteText = `Join my Billora shared account. ID: ${sharedAccountId} Link: ${inviteLink}`;

    await navigator.clipboard.writeText(inviteText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
      <div className="text-sm font-semibold text-[var(--ink)]">Invite members</div>
      <div className="text-xs text-[var(--muted)]">Share account ID or copy ready-to-send invite text.</div>
      <div className="font-mono text-xs text-[var(--ink)]">{sharedAccountId}</div>
      <button type="button" className="btn-secondary" onClick={copyInvite}>
        {copied ? "Copied" : "Copy invite"}
      </button>
    </div>
  );
}
