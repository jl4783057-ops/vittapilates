import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "pilates_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET;
}

export function getAuthorizedAdminAccounts(): Record<string, string> {
  const accounts: Record<string, string> = {};

  const owner1Email = process.env.ADMIN_OWNER_1_EMAIL?.trim().toLowerCase();
  const owner1Password = process.env.ADMIN_OWNER_1_PASSWORD;
  if (owner1Email && owner1Password) {
    accounts[owner1Email] = owner1Password;
  }

  const owner2Email = process.env.ADMIN_OWNER_2_EMAIL?.trim().toLowerCase();
  const owner2Password = process.env.ADMIN_OWNER_2_PASSWORD;
  if (owner2Email && owner2Password) {
    accounts[owner2Email] = owner2Password;
  }

  const rawCredentials = process.env.PILATES_ADMIN_CREDENTIALS;
  if (rawCredentials) {
    try {
      const parsed = JSON.parse(rawCredentials);
      for (const [key, val] of Object.entries(parsed)) {
        if (typeof key === "string" && typeof val === "string") {
          accounts[key.trim().toLowerCase()] = val;
        }
      }
    } catch {
      // Ignora erro de parse se variáveis individuais estiverem definidas
    }
  }

  return accounts;
}

export function isAdminAuthenticationConfigured() {
  const accounts = getAuthorizedAdminAccounts();
  return Boolean(Object.keys(accounts).length > 0 && sessionSecret());
}

export function verifyAdminCredentials(email: string, password: string) {
  if (!isAdminAuthenticationConfigured()) return "not-configured" as const;

  const accounts = getAuthorizedAdminAccounts();
  const normalizedEmail = email.trim().toLowerCase();
  const expectedPassword = accounts[normalizedEmail];

  const suppliedHash = createHmac("sha256", sessionSecret()!).update(password).digest();
  const expectedHash = createHmac("sha256", sessionSecret()!).update(expectedPassword || "invalid").digest();
  const passwordMatches = timingSafeEqual(suppliedHash, expectedHash);

  return expectedPassword && passwordMatches ? ("valid" as const) : ("invalid" as const);
}

export function createAdminSessionToken() {
  const expiresAt = Date.now() + SESSION_DURATION_SECONDS * 1000;
  const payload = Buffer.from(JSON.stringify({ role: "admin", expiresAt })).toString("base64url");
  const signature = createHmac("sha256", sessionSecret()!).update(payload).digest("base64url");
  return { token: `${payload}.${signature}`, expiresAt };
}

export function verifyAdminSessionToken(token?: string) {
  if (!token || !sessionSecret()) return false;
  const [payload, providedSignature] = token.split(".");
  if (!payload || !providedSignature) return false;

  const expectedSignature = createHmac("sha256", sessionSecret()!).update(payload).digest();
  let suppliedSignature: Buffer;
  try {
    suppliedSignature = Buffer.from(providedSignature, "base64url");
  } catch {
    return false;
  }
  if (suppliedSignature.length !== expectedSignature.length || !timingSafeEqual(suppliedSignature, expectedSignature)) {
    return false;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return session.role === "admin" && Number(session.expiresAt) > Date.now();
  } catch {
    return false;
  }
}

export const adminSessionDurationSeconds = SESSION_DURATION_SECONDS;
