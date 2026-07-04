import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth, type AuthRequest } from "../auth";

export function registerPushRoutes(app: Express) {
  /** POST /api/push/subscribe */
  app.post("/api/push/subscribe", requireAuth, (req: AuthRequest, res) => {
    const { endpoint, p256dh, auth } = req.body;
    if (!endpoint || !p256dh || !auth) return res.status(400).json({ error: "endpoint, p256dh, auth обязательны" });
    const sub = storage.savePushSubscription({ userId: req.user!.id, endpoint, p256dh, auth });
    res.json({ sub });
  });

  /** GET /api/push/vapid-public-key */
  app.get("/api/push/vapid-public-key", (_req, res) => {
    res.json({ key: process.env.VAPID_PUBLIC_KEY || null });
  });
}
