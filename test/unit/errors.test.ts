import { describe, expect, it } from "vitest";
import { ApiError } from "../../server/errors";

describe("ApiError", () => {
  it("serializes status code and message", () => {
    const err = ApiError.badRequest("bad", { field: "x" });
    expect(err.status).toBe(400);
    expect(err.code).toBe("bad_request");
    expect(err.toJSON()).toEqual({ error: "bad", code: "bad_request", details: { field: "x" } });
  });

  it("provides factory helpers", () => {
    expect(ApiError.unauthorized().status).toBe(401);
    expect(ApiError.forbidden().status).toBe(403);
    expect(ApiError.notFound().status).toBe(404);
    expect(ApiError.conflict("dup").status).toBe(409);
  });
});
