import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../auth";

// ── Doctor role middleware ──────────────────────────────────────────────────
export function requireDoctor(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Не авторизован" });
  if (req.user.role !== "doctor" && req.user.role !== "admin") {
    return res.status(403).json({ error: "Доступ только для врачей" });
  }
  next();
}
