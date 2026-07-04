/**
 * Phase 35.4 — Unit tests for server/mail.ts
 * Uses nodemailer mock to avoid real SMTP connections.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// vi.hoisted ensures variables are available before module mock factory runs
const { mockSendMail, mockCreateTransport } = vi.hoisted(() => {
  const mockSendMail = vi.fn().mockResolvedValue({ messageId: "test-id" });
  const mockCreateTransport = vi.fn().mockReturnValue({ sendMail: mockSendMail });
  return { mockSendMail, mockCreateTransport };
});

vi.mock("nodemailer", () => ({
  default: { createTransport: mockCreateTransport },
}));

import { isSmtpConfigured, sendPasswordResetEmail } from "../../server/mail";

describe("isSmtpConfigured", () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    saved.SMTP_HOST = process.env.SMTP_HOST;
    saved.SMTP_USER = process.env.SMTP_USER;
    saved.SMTP_PASS = process.env.SMTP_PASS;
  });
  afterEach(() => {
    process.env.SMTP_HOST = saved.SMTP_HOST;
    process.env.SMTP_USER = saved.SMTP_USER;
    process.env.SMTP_PASS = saved.SMTP_PASS;
    if (saved.SMTP_HOST === undefined) delete process.env.SMTP_HOST;
    if (saved.SMTP_USER === undefined) delete process.env.SMTP_USER;
    if (saved.SMTP_PASS === undefined) delete process.env.SMTP_PASS;
  });

  it("returns false when all vars missing", () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    expect(isSmtpConfigured()).toBe(false);
  });

  it("returns false when only SMTP_HOST set", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    expect(isSmtpConfigured()).toBe(false);
  });

  it("returns false when SMTP_USER is whitespace only", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "  ";
    process.env.SMTP_PASS = "pass";
    expect(isSmtpConfigured()).toBe(false);
  });

  it("returns true when all three vars are set", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "user@example.com";
    process.env.SMTP_PASS = "secret";
    expect(isSmtpConfigured()).toBe(true);
  });
});

describe("sendPasswordResetEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "noreply@example.com";
    process.env.SMTP_PASS = "secret";
    process.env.SMTP_PORT = "587";
    delete process.env.SMTP_FROM;
  });

  afterEach(() => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_FROM;
  });

  it("throws when SMTP not configured", async () => {
    delete process.env.SMTP_HOST;
    await expect(sendPasswordResetEmail("user@example.com", "https://example.com/reset?token=abc")).rejects.toThrow(
      "SMTP is not configured",
    );
  });

  it("calls createTransport with correct config", async () => {
    await sendPasswordResetEmail("recipient@example.com", "https://example.com/reset?token=xyz");
    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.example.com",
        port: 587,
        secure: false,
        auth: { user: "noreply@example.com", pass: "secret" },
      }),
    );
  });

  it("calls sendMail with correct to/subject", async () => {
    await sendPasswordResetEmail("recipient@example.com", "https://example.com/reset?token=xyz");
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "recipient@example.com",
        subject: "Сброс пароля — Food Diary",
      }),
    );
  });

  it("includes reset URL in text and html body", async () => {
    const resetUrl = "https://example.com/reset?token=abc123";
    await sendPasswordResetEmail("user@example.com", resetUrl);
    const call = mockSendMail.mock.calls[0][0] as { text: string; html: string };
    expect(call.text).toContain(resetUrl);
    expect(call.html).toContain(resetUrl);
  });

  it("uses port 465 with secure=true when SMTP_PORT=465", async () => {
    process.env.SMTP_PORT = "465";
    await sendPasswordResetEmail("u@example.com", "https://example.com/r");
    expect(mockCreateTransport).toHaveBeenCalledWith(expect.objectContaining({ port: 465, secure: true }));
  });

  it("uses SMTP_FROM as sender when set", async () => {
    process.env.SMTP_FROM = "food-diary@example.com";
    await sendPasswordResetEmail("u@example.com", "https://example.com/r");
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({ from: "food-diary@example.com" }));
  });

  it("falls back to SMTP_USER as sender when SMTP_FROM not set", async () => {
    await sendPasswordResetEmail("u@example.com", "https://example.com/r");
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({ from: "noreply@example.com" }));
  });
});
