/**
 * Phase 29 W5 — createApp() boot tests (helmet / cors)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { createApp, allowedOrigins } from "../../server/app";

describe("createApp boot", () => {
  const prev = {
    NODE_ENV: process.env.NODE_ENV,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    PUBLIC_URL: process.env.PUBLIC_URL,
    DOMAIN: process.env.DOMAIN,
  };

  afterEach(() => {
    process.env.NODE_ENV = prev.NODE_ENV;
    process.env.ALLOWED_ORIGINS = prev.ALLOWED_ORIGINS;
    process.env.PUBLIC_URL = prev.PUBLIC_URL;
    process.env.DOMAIN = prev.DOMAIN;
  });

  beforeEach(() => {
    process.env.NODE_ENV = "production";
    process.env.ALLOWED_ORIGINS = "https://allowed.example";
    delete process.env.PUBLIC_URL;
    delete process.env.DOMAIN;
  });

  it("applies helmet security headers", async () => {
    const app = createApp();
    app.get("/__ping", (_req, res) => res.status(200).json({ ok: true }));

    const res = await request(app).get("/__ping").expect(200);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBeDefined();
  });

  it("allows configured CORS origin", async () => {
    const app = createApp();
    app.get("/__ping", (_req, res) => res.status(200).json({ ok: true }));

    const res = await request(app).get("/__ping").set("Origin", "https://allowed.example").expect(200);
    expect(res.headers["access-control-allow-origin"]).toBe("https://allowed.example");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("rejects unknown CORS origin", async () => {
    const app = createApp();
    app.get("/__ping", (_req, res) => res.status(200).json({ ok: true }));

    const res = await request(app).get("/__ping").set("Origin", "https://evil.example").expect(200);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("exposes /metrics without opening storage", async () => {
    const app = createApp();
    const res = await request(app).get("/metrics").expect(200);
    expect(res.text).toContain("http_requests");
  });

  it("allowedOrigins includes env + public/domain URLs", () => {
    process.env.PUBLIC_URL = "https://public.example";
    process.env.DOMAIN = "domain.example";
    const origins = allowedOrigins();
    expect(origins).toContain("https://allowed.example");
    expect(origins).toContain("https://public.example");
    expect(origins).toContain("https://domain.example");
    expect(origins).not.toContain("http://localhost:5000");
  });
});
