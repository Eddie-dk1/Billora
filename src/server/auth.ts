import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { authOptions } from "@/server/auth-options";
import { isUserOnboardingComplete } from "@/server/services/settings";

export async function getCurrentSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

export async function requireUserId(): Promise<string> {
  const session = await getCurrentSession();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/auth/sign-in");
  }

  return userId;
}

export async function requireOnboardedUserId(): Promise<string> {
  const userId = await requireUserId();
  const completed = await isUserOnboardingComplete(userId);

  if (!completed) {
    redirect("/onboarding" as never);
  }

  return userId;
}

export async function getOptionalUserId(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.user?.id ?? null;
}

