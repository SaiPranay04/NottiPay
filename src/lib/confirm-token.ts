import { createHash, randomBytes } from "node:crypto";

type TokenRow = { hash: string; payload: unknown; expiresAt: number; used: boolean };

const tokens = new Map<string, TokenRow>();

export function issueConfirmToken(payload: unknown, ttlMs = 10 * 60 * 1000): string {
  const raw = randomBytes(24).toString("hex");
  const hash = createHash("sha256").update(raw).digest("hex");
  tokens.set(hash, { hash, payload, expiresAt: Date.now() + ttlMs, used: false });
  return raw;
}

export function takeConfirmToken(raw: string): { ok: true; payload: unknown } | { ok: false } {
  const hash = createHash("sha256").update(raw).digest("hex");
  const row = tokens.get(hash);
  if (!row || row.used || row.expiresAt < Date.now()) return { ok: false };
  row.used = true;
  return { ok: true, payload: row.payload };
}
