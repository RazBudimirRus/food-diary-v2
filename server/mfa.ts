/**
 * mfa.ts — Phase 28.2: TOTP MFA for doctor and admin roles.
 *
 * Uses `otpauth` (RFC 6238 TOTP) and `qrcode` to generate QR codes.
 * TOTP secrets are stored AES-256-GCM encrypted in DB.
 * The mfa_secret column stores JSON: { iv: string; enc: string }
 */

import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { encryptSecret, decryptSecret } from "./auth";

const ISSUER = "Food Diary";
const DIGITS = 6;
const PERIOD = 30;

/** Serialize encrypted TOTP secret to a single string for DB storage */
function packSecret(iv: string, encryptedValue: string): string {
  return JSON.stringify({ iv, enc: encryptedValue });
}

/** Deserialize from DB */
function unpackSecret(packed: string): { iv: string; enc: string } {
  return JSON.parse(packed) as { iv: string; enc: string };
}

/**
 * Generate a new TOTP secret and return:
 *  - packedSecret: store this in users.mfa_secret
 *  - qrDataUrl: show this to the user for QR scanning
 *  - uri: otpauth:// URI (for manual entry)
 */
export async function generateMfaSetup(username: string): Promise<{
  packedSecret: string;
  qrDataUrl: string;
  uri: string;
}> {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: username,
    algorithm: "SHA1",
    digits: DIGITS,
    period: PERIOD,
    secret: new OTPAuth.Secret({ size: 20 }),
  });

  const uri = totp.toString();
  const qrDataUrl = await QRCode.toDataURL(uri);
  const { encryptedValue, iv } = encryptSecret(totp.secret.base32);
  const packedSecret = packSecret(iv, encryptedValue);

  return { packedSecret, qrDataUrl, uri };
}

/**
 * Verify a TOTP token against a packed encrypted secret from DB.
 * Returns true if valid (window ±1 step = ±30s tolerance).
 */
export function verifyMfaToken(packedSecret: string, token: string): boolean {
  try {
    const { iv, enc } = unpackSecret(packedSecret);
    const base32Secret = decryptSecret(enc, iv);
    const totp = new OTPAuth.TOTP({
      issuer: ISSUER,
      algorithm: "SHA1",
      digits: DIGITS,
      period: PERIOD,
      secret: OTPAuth.Secret.fromBase32(base32Secret),
    });
    // delta: null = invalid, 0 or ±1 = valid within window
    const delta = totp.validate({ token, window: 1 });
    return delta !== null;
  } catch {
    return false;
  }
}
