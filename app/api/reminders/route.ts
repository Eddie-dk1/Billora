import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/server/auth-options";
import { type AppContextType } from "@/server/context";
import { getInAppReminders } from "@/server/services/reminders";
import { isUserOnboardingComplete } from "@/server/services/settings";

function resolveContext(raw: string | null): AppContextType | undefined {
  if (raw === "personal" || raw === "shared") {
    return raw;
  }

  return undefined;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const onboardingComplete = await isUserOnboardingComplete(userId);
  if (!onboardingComplete) {
    return NextResponse.json({ error: "onboarding_required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const context = resolveContext(searchParams.get("context"));
  const unreadOnly = searchParams.get("unreadOnly") === "1";
  const limitRaw = Number(searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 50;

  const reminders = await getInAppReminders(userId, {
    context,
    unreadOnly,
    limit,
  });

  return NextResponse.json({ status: "ok", reminders });
}
