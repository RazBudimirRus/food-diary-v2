import type { Express, NextFunction } from "express";
import { randomUUID } from "crypto";
import { storage } from "../storage";
import { requireAuth, type AuthRequest } from "../auth";
import { uploadPhoto, downloadPhoto, deleteFromS3, buildPhotoKey, isS3Configured, PHOTO_MAX_PER_USER } from "../s3";
import { upload } from "./upload";
import { assertDoctorAssigned, paramValue } from "./helpers";
import { ApiError } from "../errors";

export function registerPhotosRoutes(app: Express) {
  // ════════════════════════════════════════════════════════════════════
  // Phase 23 — S3 Photos
  // ════════════════════════════════════════════════════════════════════

  /** POST /api/photos/upload */
  app.post(
    "/api/photos/upload",
    requireAuth,
    upload.single("photo"),
    async (req: AuthRequest, res, next: NextFunction) => {
      const mealId = req.body.mealId ? parseInt(req.body.mealId, 10) : null;
      const photoId = randomUUID();
      const s3Key = buildPhotoKey(req.user!.id, photoId);

      try {
        if (!isS3Configured()) throw new ApiError(503, "S3 хранилище не настроено", "service_unavailable");
        if (!req.file) throw ApiError.badRequest("Файл не передан");

        if (mealId != null && !Number.isNaN(mealId)) {
          const meal = storage.getMeal(mealId);
          if (!meal) throw ApiError.notFound("Приём пищи не найден");
          if (meal.userId !== req.user!.id) throw ApiError.forbidden("Нет доступа");
        }

        // Проверяем лимит фотографий пользователя
        const count = storage.countUserPhotos(req.user!.id);
        if (count >= PHOTO_MAX_PER_USER) {
          throw new ApiError(429, `Достигнут лимит фотографий (${PHOTO_MAX_PER_USER})`, "rate_limited");
        }

        const sizeBytes = await uploadPhoto(s3Key, req.file.buffer, req.file.mimetype);
        const photo = storage.savePhoto({ id: photoId, userId: req.user!.id, mealId, s3Key, sizeBytes });
        res.json({ photo });
      } catch (e: any) {
        // Phase 28.4: virus detected (422) or other upload error
        if (e.status === 422) {
          // Write audit log entry for virus detection
          storage
            .addAuditLog({
              actorId: req.user!.id,
              actorRole: req.user!.role,
              action: "photo_virus_detected",
              detail: `s3Key=${s3Key} filename=${req.file?.originalname ?? "unknown"} reason=${e.message}`,
              ip: req.ip ?? null,
            })
            .catch(() => {}); // fire-and-forget, don't break the response
          return next(new ApiError(422, e.message, "unprocessable_entity"));
        }
        next(e);
      }
    },
  );

  /** GET /api/photos/:photo_id — proxy, no direct S3 URL.
   * Поддерживает авторизацию через ?token= query param (для <img src>).
   */
  app.get("/api/photos/:photo_id", async (req: AuthRequest, res, next: NextFunction) => {
    try {
      // Авторизация: Bearer header или ?token= query param (для <img src>)
      const { verifyToken } = await import("../auth");
      const header = req.headers.authorization;
      const bearerToken = header?.startsWith("Bearer ") ? header.slice(7) : null;
      const queryToken = typeof req.query.token === "string" ? req.query.token : null;
      const rawToken = bearerToken ?? queryToken;
      if (!rawToken) return res.status(401).json({ error: "Не авторизован" });
      let userId: number;
      try {
        const payload = verifyToken(rawToken);
        userId = payload.userId;
        const user = storage.getUserById(userId);
        if (!user) return res.status(401).json({ error: "Пользователь не найден" });
        req.user = user;
      } catch {
        return res.status(401).json({ error: "Токен недействителен или истёк" });
      }
      if (!isS3Configured()) throw new ApiError(503, "S3 не настроен", "service_unavailable");
      const photo = storage.getPhoto(paramValue(req.params.photo_id));
      if (!photo) throw ApiError.notFound("Фото не найдено");
      if (photo.userId !== req.user!.id) {
        const doctor = storage.getDoctorByUserId(req.user!.id);
        if (!doctor) throw ApiError.forbidden("Нет доступа");
        assertDoctorAssigned(doctor.id, photo.userId);
      }
      const buf = await downloadPhoto(photo.s3Key);
      res.setHeader("Content-Type", "image/webp");
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.send(buf);
    } catch (e: any) {
      next(e);
    }
  });

  /** DELETE /api/photos/:photo_id */
  app.delete("/api/photos/:photo_id", requireAuth, async (req: AuthRequest, res, next: NextFunction) => {
    try {
      if (!isS3Configured()) throw new ApiError(503, "S3 не настроен", "service_unavailable");
      const photo = storage.getPhoto(paramValue(req.params.photo_id));
      if (!photo) throw ApiError.notFound("Фото не найдено");
      if (photo.userId !== req.user!.id) throw ApiError.forbidden("Нет доступа");
      await deleteFromS3(photo.s3Key);
      storage.deletePhoto(photo.id);
      res.json({ ok: true });
    } catch (e: any) {
      next(e);
    }
  });
}
