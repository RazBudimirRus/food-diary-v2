/**
 * Prometheus metrics (Phase 27.4)
 *
 * Exposes /metrics endpoint for Prometheus scraping.
 * Includes: default Node.js metrics + custom HTTP metrics.
 */
import { Registry, collectDefaultMetrics, Counter, Histogram } from "prom-client";

export const registry = new Registry();
registry.setDefaultLabels({ app: "food-diary-api" });

// Collect default Node.js metrics (heap, GC, event loop lag, etc.)
collectDefaultMetrics({ register: registry });

// ── HTTP metrics ───────────────────────────────────────────────────────────────
export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [registry],
});

export const httpRequestDurationMs = new Histogram({
  name: "http_request_duration_ms",
  help: "HTTP request duration in milliseconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
  registers: [registry],
});

// ── AI API metrics ─────────────────────────────────────────────────────────────
export const deepseekApiCallsTotal = new Counter({
  name: "deepseek_api_calls_total",
  help: "Total DeepSeek API calls",
  labelNames: ["status"],
  registers: [registry],
});

export const deepseekTokensTotal = new Counter({
  name: "deepseek_tokens_total",
  help: "Total tokens consumed by DeepSeek API",
  labelNames: ["direction"],
  registers: [registry],
});
