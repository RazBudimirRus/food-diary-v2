import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { Request, Response, NextFunction, CookieOptions } from "express";
import { storage } from "./storage";
import type { User } from "@shared/schema";

// ── Config ────────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production");
  }
  console.warn("[auth] JWT_SECRET not set — using insecure dev default");
  return "dev-insecure-secret-change-me";
})();

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Secure flag: COOKIE_SECURE=1 in prod behind HTTPS; COOKIE_SECURE=0 for local HTTP dev */
export function isSecureCookie(): boolean {
  if (process.env.COOKIE_SECURE === "1") return true;
  if (process.env.COOKIE_SECURE === "0") return false;
  return process.env.NODE_ENV === "production";
}

export function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  };
}

export function clearAuthCookieOptions(): CookieOptions {
  const { maxAge: _maxAge, ...rest } = authCookieOptions();
  return rest;
}

// AES-256-GCM key for encrypting secrets in DB
// Must be 32 bytes (256 bits). Derived from ENCRYPTION_KEY env var.
const ENCRYPTION_KEY_RAW = process.env.ENCRYPTION_KEY || (() => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("ENCRYPTION_KEY must be set in production");
  }
  console.warn("[auth] ENCRYPTION_KEY not set — using insecure dev default");
  return "dev-insecure-encryption-key-32b!!";
})();

// Derive a fixed 32-byte key from whatever string is in env
const ENC_KEY = crypto.createHash("sha256").update(ENCRYPTION_KEY_RAW).digest();

// ── Password ──────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── JWT ───────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: number;
  username: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

// ── Middleware ────────────────────────────────────────────────────────────────

export interface AuthRequest extends Request {
  user?: User;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : req.cookies?.token;

  if (!token) return res.status(401).json({ error: "Не авторизован" });

  try {
    const payload = verifyToken(token);
    const user = storage.getUserById(payload.userId);
    if (!user) return res.status(401).json({ error: "Пользователь не найден" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Токен недействителен или истёк" });
  }
}

// ── AES-256-GCM secret encryption ────────────────────────────────────────────

export function encryptSecret(plaintext: string): { encryptedValue: string; iv: string } {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", ENC_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Store: ciphertext + 16-byte auth tag concatenated, base64-encoded
  const combined = Buffer.concat([encrypted, tag]);
  return {
    encryptedValue: combined.toString("base64"),
    iv: iv.toString("base64"),
  };
}

export function decryptSecret(encryptedValue: string, iv: string): string {
  const combined = Buffer.from(encryptedValue, "base64");
  const ivBuf = Buffer.from(iv, "base64");
  // Last 16 bytes are the auth tag
  const tag = combined.subarray(combined.length - 16);
  const ciphertext = combined.subarray(0, combined.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", ENC_KEY, ivBuf);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}
