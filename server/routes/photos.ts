import type { Express } from "express";
import { randomUUID } from "crypto";
import { storage } from "../storage";
import { requireAuth, type AuthRequest } from "../auth";
import { uploadPhoto, downloadPhoto, deleteFromS3, buildPhotoKey, isS3Configured, PHOTO_MAX_PER_USER } from "../s3";
import { upload } from "./upload";
import { paramValue } from "./helpers";

export function registerPhotosRoutes(app: Express) {
  // ════════════════════════════════════════════════════════════════════
  // Phase 23 — S3 Photos
  // ════════════════════════════════════════════════════════════════════

  /** POST /api/photos/upload */
  app.post("/api/photos/upload", requireAuth, upload.single("photo"), async (req: AuthRequest, res) => {
    if (!isS3Configured()) return res.status(503).json({ error: "S3 хранилище не настроено" });
    if (!req.file) return res.status(400).json({ error: "Файл не передан" });

    // Проверяем лимит фотографий пользователя
    const count = storage.countUserPhotos(req.user!.id);
    if (count >= PHOTO_MAX_PER_USER) {
      return res.status(429).json({ error: `Достигнут лимит фотографий (${PHOTO_MAX_PER_USER})` });
    }

    const mealId = req.body.mealId ? parseInt(req.body.mealId, 10) : null;
    const photoId = randomUUID();
    const s3Key = buildPhotoKey(req.user!.id, photoId);

    try {
      const sizeBytes = await uploadPhoto(s3Key, req.file.buffer, req.file.mimetype);
      const photo = storage.savePhoto({ id: photoId, userId: req.user!.id, mealId, s3Key, sizeBytes });
      res.json({ photo });
    } catch (e: any) {
      // Phase 28.4: virus detected (422) or other upload error
      if (e.status === 422) {
        // Write audit log entry for virus detection
        storage
          .addAuditLog({
            userId: req.user!.id,
            action: "photo_virus_detected",
            detail: `s3Key=${s3Key} filename=${req.file.originalname ?? "unknown"} reason=${e.message}`,
            ip: req.ip ?? null,
          })
          .catch(() => {}); // fire-and-forget, don\'t break the response
        return res.status(422).json({ error: e.message });
      }
      res.status(500).json({ error: e.message });
    }
  });

  /** GET /api/photos/:photo_id — proxy, no direct S3 URL */
  app.get("/api/photos/:photo_id", requireAuth, async (req: AuthRequest, res) => {
    if (!isS3Configured()) return res.status(503).json({ error: "S3 не настроен" });
    const photo = storage.getPhoto(paramValue(req.params.photo_id));
    if (!photo) return res.status(404).json({ error: "Фото не найдено" });
    if (photo.userId !== req.user!.id) {
      // Врач тоже может просматривать
      const doctor = storage.getDoctorByUserId(req.user!.id);
      if (!doctor) return res.status(403).json({ error: "Нет доступа" });
    }
    try {
      const buf = await downloadPhoto(photo.s3Key);
      res.setHeader("Content-Type", "image/webp");
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.send(buf);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** DELETE /api/photos/:photo_id */
  app.delete("/api/photos/:photo_id", requireAuth, async (req: AuthRequest, res) => {
    if (!isS3Configured()) return res.status(503).json({ error: "S3 не настроен" });
    const photo = storage.getPhoto(paramValue(req.params.photo_id));
    if (!photo) return res.status(404).json({ error: "Фото не найдено" });
    if (photo.userId !== req.user!.id) return res.status(403).json({ error: "Нет доступа" });
    try {
      await deleteFromS3(photo.s3Key);
      storage.deletePhoto(photo.id);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
