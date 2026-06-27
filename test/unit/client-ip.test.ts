import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { getClientIp } from "../../server/client-ip";

function mockRequest(headers: Record<string, string | string[]>, ip = "127.0.0.1"): Pick<Request, "ip" | "headers" | "socket"> {
  return {
    ip,
    headers,
    socket: { remoteAddress: "10.0.0.1" } as Request["socket"],
  };
}

describe("getClientIp", () => {
  it("prefers CF-Connecting-IP from Cloudflare", () => {
    const req = mockRequest({
      "cf-connecting-ip": "203.0.113.10",
      "x-forwarded-for": "198.51.100.1",
    }, "192.0.2.1");

    expect(getClientIp(req)).toBe("203.0.113.10");
  });

  it("falls back to the first X-Forwarded-For address", () => {
    const req = mockRequest({
      "x-forwarded-for": "203.0.113.20, 10.0.0.5",
    });

    expect(getClientIp(req)).toBe("203.0.113.20");
  });

  it("falls back to req.ip when proxy headers are absent", () => {
    const req = mockRequest({}, "192.0.2.44");
    expect(getClientIp(req)).toBe("192.0.2.44");
  });
});
