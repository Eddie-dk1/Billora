function readBearerToken(header: string | null): string | null {
  if (!header) {
    return null;
  }

  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export function isJobRequestAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const bearer = readBearerToken(request.headers.get("authorization"));
  const direct = request.headers.get("x-cron-secret")?.trim() ?? null;

  return bearer === secret || direct === secret;
}
