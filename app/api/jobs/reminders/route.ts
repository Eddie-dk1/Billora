import { NextResponse } from "next/server";
import { isJobRequestAuthorized } from "@/server/job-auth";
import { runRemindersJob } from "@/server/services/reminders";

export async function POST(request: Request) {
  if (!isJobRequestAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runRemindersJob();
  return NextResponse.json({ status: "ok", job: "reminders", result });
}
