import { createHmac } from "node:crypto";

function getSecret(): string {
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || "fallback-dev-secret";
}

export function createAuthToken(): string {
  const timestamp = Date.now().toString();
  const hmac = createHmac("sha256", getSecret());
  hmac.update(timestamp);
  const signature = hmac.digest("hex");
  return `${timestamp}.${signature}`;
}

export function verifyAuthToken(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [timestamp, signature] = parts;
  if (!timestamp || !signature) return false;

  // Check token age (max 7 days)
  const age = Date.now() - Number(timestamp);
  if (Number.isNaN(age) || age < 0 || age > 7 * 24 * 60 * 60 * 1000) return false;

  const hmac = createHmac("sha256", getSecret());
  hmac.update(timestamp);
  const expected = hmac.digest("hex");

  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}
