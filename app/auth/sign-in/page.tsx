import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/server/auth-options";
import { SignInForm } from "./sign-in-form";

type SignInReason = "session_required" | "signed_out";

function resolveErrorMessage(raw: string | undefined): string | null {
  if (!raw) {
    return null;
  }

  if (raw === "CredentialsSignin") {
    return "Sign-in failed. Check your email and password.";
  }

  if (raw === "AccessDenied") {
    return "Access denied for this account.";
  }

  return "Authentication error. Try again.";
}

function resolveReasonMessage(raw: string | undefined): string | null {
  if (!raw) {
    return null;
  }

  const reason = raw as SignInReason;
  if (reason === "session_required") {
    return "Please sign in to continue.";
  }

  if (reason === "signed_out") {
    return "You have signed out successfully.";
  }

  return null;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    redirect("/");
  }

  const params = await searchParams;
  const rawCallback = Array.isArray(params.callbackUrl) ? params.callbackUrl[0] : params.callbackUrl;
  const rawError = Array.isArray(params.error) ? params.error[0] : params.error;
  const rawReason = Array.isArray(params.reason) ? params.reason[0] : params.reason;

  const callbackUrl = rawCallback && rawCallback.startsWith("/") ? rawCallback : "/";
  const reasonMessage = resolveReasonMessage(rawReason);
  const authErrorMessage = resolveErrorMessage(rawError);

  return (
    <section className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold text-[var(--ink)]">Sign in</h1>
      {reasonMessage ? (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)]">
          {reasonMessage}
        </div>
      ) : null}
      {authErrorMessage ? (
        <div className="rounded-xl border border-[#e5b7b7] bg-[#fdf2f2] px-3 py-2 text-sm font-semibold text-[#ab2f2f]">
          {authErrorMessage}
        </div>
      ) : null}
      <div className="soft-card p-4">
        <SignInForm callbackUrl={callbackUrl} />
      </div>
      <p className="text-xs text-[var(--muted)]">Demo credentials: demo@billora.app / DemoPass123!</p>
    </section>
  );
}
