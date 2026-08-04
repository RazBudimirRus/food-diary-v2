/**
 * Typed API errors for route handlers (Phase 29.1).
 * Throw from routes / services; error middleware maps to JSON.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, message: string, code = "error", details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, message, "bad_request", details);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message, "unauthorized");
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(403, message, "forbidden");
  }

  static notFound(message = "Not found") {
    return new ApiError(404, message, "not_found");
  }

  static conflict(message: string) {
    return new ApiError(409, message, "conflict");
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...(this.details !== undefined ? { details: this.details } : {}),
    };
  }
}
