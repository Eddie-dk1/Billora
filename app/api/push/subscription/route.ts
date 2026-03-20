import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/server/auth-options";
import { upsertPushSubscription, deactivatePushSubscription } from "@/server/services/push-subscriptions";
import { isUserOnboardingComplete } from "@/server/services/settings";

const subscriptionSchema = z.object({
  endpoint: z.string().trim().url(),
  expirationTime: z.number().nullable(),
  keys: z.object({
    p256dh: z.string().trim().min(1),
    auth: z.string().trim().min(1),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().trim().url(),
});

async function requireSessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function POST(request: Request) {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await isUserOnboardingComplete(userId))) {
    return NextResponse.json({ error: "onboarding_required" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = subscriptionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_subscription_payload" }, { status: 400 });
  }

  const userAgent = request.headers.get("user-agent") ?? undefined;
  await upsertPushSubscription(userId, parsed.data, userAgent);

  return NextResponse.json({ status: "ok" });
}

export async function DELETE(request: Request) {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = unsubscribeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_unsubscribe_payload" }, { status: 400 });
  }

  await deactivatePushSubscription(userId, parsed.data.endpoint);
  return NextResponse.json({ status: "ok" });
}
