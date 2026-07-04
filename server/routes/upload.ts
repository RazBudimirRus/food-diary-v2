import multer from "multer";
import { PHOTO_MAX_SIZE_BYTES } from "../s3";

// ── Multer (memory storage — файл передаётся в S3, на диск не сохраняем) ────
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PHOTO_MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Только изображения") as any, false);
    }
    cb(null, true);
  },
});
