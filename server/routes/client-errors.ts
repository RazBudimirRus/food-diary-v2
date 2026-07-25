/**
 * client-errors.ts — API для логирования клиентских ошибок.
 *
 * POST /api/client-errors  — принимает ошибку с фронта (без auth, rate-limited)
 * GET  /api/admin/client-errors — список ошибок за 7 дней (только admin)
 */

import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireAuth, requireAdmin, type AuthRequest } from "../auth";
import rateLimit from "express-rate-limit";

export const clientErrorsRouter = Router();

// Rate limit: max 20 ошибок в минуту с одного IP (защита от флуда)
const errorReportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many error reports" },
});

const reportSchema = z.object({
  message: z.string().max(1000),
  stack: z.string().max(5000).optional().nullable(),
  url: z.string().max(500).optional().nullable(),
  extra: z.preprocess(
    (v) => (typeof v === "object" && v !== null ? JSON.stringify(v) : v),
    z.string().max(2000).optional().nullable(),
  ),
});

// POST /api/client-errors — публичный endpoint (rate-limited)
clientErrorsRouter.post("/", errorReportLimiter, (req, res) => {
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const userId = (req as { user?: { id: number } }).user?.id ?? null;

  try {
    storage.addClientError({
      userId,
      message: parsed.data.message,
      stack: parsed.data.stack ?? null,
      url: parsed.data.url ?? null,
      userAgent: req.headers["user-agent"] ?? null,
      extra: parsed.data.extra ?? null,
    });
    res.json({ ok: true });
  } catch {
    // Не возвращаем 500 — клиент не должен падать из-за ошибки в логировании ошибок
    res.json({ ok: false });
  }
});

// GET /api/client-errors/admin — только для adminа
clientErrorsRouter.get("/admin", requireAuth, requireAdmin, (_req: AuthRequest, res) => {
  try {
    const errors = storage.getClientErrors(200);
    res.json({ errors });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});
