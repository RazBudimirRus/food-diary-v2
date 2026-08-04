import { eq } from "drizzle-orm";
import { photos, type Photo } from "@shared/schema";
import { db, sqlite } from "../db";

export class PhotoRepository {
  savePhoto(data: { id: string; userId: number; mealId?: number | null; s3Key: string; sizeBytes: number }): Photo {
    return db
      .insert(photos)
      .values({
        id: data.id,
        userId: data.userId,
        mealId: data.mealId ?? null,
        s3Key: data.s3Key,
        sizeBytes: data.sizeBytes,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get();
  }

  getPhoto(photoId: string): Photo | undefined {
    return db.select().from(photos).where(eq(photos.id, photoId)).get();
  }

  getPhotosByMeal(mealId: number): Photo[] {
    return db.select().from(photos).where(eq(photos.mealId, mealId)).all();
  }

  getPhotosByUser(userId: number): Photo[] {
    return db.select().from(photos).where(eq(photos.userId, userId)).all();
  }

  deletePhoto(photoId: string): void {
    db.delete(photos).where(eq(photos.id, photoId)).run();
  }

  countUserPhotos(userId: number): number {
    const row = sqlite.prepare("SELECT COUNT(*) as cnt FROM photos WHERE user_id = ?").get(userId) as {
      cnt: number;
    };
    return row.cnt;
  }
}

export const photoRepository = new PhotoRepository();
