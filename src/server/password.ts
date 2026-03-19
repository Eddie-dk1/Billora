import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;
const N = 16384;
const R = 8;
const P = 1;

type ScryptHashParts = {
  n: number;
  r: number;
  p: number;
  salt: Buffer;
  derivedKey: Buffer;
};

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(password, salt, KEY_LENGTH, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${derivedKey.toString("base64")}`;
}

export async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) {
    return false;
  }

  const parsed = parseHash(hash);
  if (!parsed) {
    return false;
  }

  const computed = scryptSync(password, parsed.salt, parsed.derivedKey.length, {
    N: parsed.n,
    r: parsed.r,
    p: parsed.p,
  });

  if (computed.length !== parsed.derivedKey.length) {
    return false;
  }

  return timingSafeEqual(computed, parsed.derivedKey);
}

function parseHash(raw: string): ScryptHashParts | null {
  const parts = raw.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return null;
  }

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return null;
  }

  try {
    return {
      n,
      r,
      p,
      salt: Buffer.from(parts[4], "base64"),
      derivedKey: Buffer.from(parts[5], "base64"),
    };
  } catch {
    return null;
  }
}
