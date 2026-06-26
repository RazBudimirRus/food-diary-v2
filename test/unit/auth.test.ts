import { describe, expect, it } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.SQLITE_DB_PATH = join(tmpdir(), `food-diary-unit-auth-${process.pid}-${Date.now()}.db`);
process.env.JWT_SECRET = "unit-test-jwt-secret-change-me-32";
process.env.ENCRYPTION_KEY = "unit-test-encryption-key-change-me-32";

describe("auth utilities", () => {
  it("hashes refresh tokens deterministically without returning the raw token", async () => {
    const { hashToken } = await import("../../server/auth");

    const rawToken = "refresh-token-value";

    expect(hashToken(rawToken)).toBe(hashToken(rawToken));
    expect(hashToken(rawToken)).not.toBe(rawToken);
    expect(hashToken(rawToken)).toHaveLength(64);
  });

  it("encrypts and decrypts secrets", async () => {
    const { encryptSecret, decryptSecret } = await import("../../server/auth");

    const secret = "deepseek-test-key";
    const encrypted = encryptSecret(secret);

    expect(encrypted.encryptedValue).not.toContain(secret);
    expect(decryptSecret(encrypted.encryptedValue, encrypted.iv)).toBe(secret);
  });
});
