import { NextResponse } from "next/server";
import { isJobRequestAuthorized } from "@/server/job-auth";
import { runFxSyncJob } from "@/server/services/fx";

export async function POST(request: Request) {
  if (!isJobRequestAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runFxSyncJob();
  return NextResponse.json({ status: "ok", job: "fx-sync", result });
}
