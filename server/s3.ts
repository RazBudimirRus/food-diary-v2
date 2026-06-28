/**
 * s3.ts — VK Object Storage (S3-compatible) client.
 * Сервер всегда проксирует — прямые URL клиенту не отдаются.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { Readable } from "stream";

const ENDPOINT = process.env.VK_S3_ENDPOINT || "https://hb.vkcs.cloud";
const REGION = process.env.VK_S3_REGION || "ru-msk";
const BUCKET = process.env.VK_S3_BUCKET || "food-diary-photos";
const ACCESS_KEY = process.env.VK_S3_ACCESS_KEY || "";
const SECRET_KEY = process.env.VK_S3_SECRET_KEY || "";

export const PHOTO_MAX_SIZE_BYTES = (Number(process.env.PHOTO_MAX_SIZE_MB) || 10) * 1024 * 1024;
export const PHOTO_MAX_PER_USER = Number(process.env.PHOTO_MAX_PER_USER) || 500;

let _client: S3Client | null = null;

export function isS3Configured(): boolean {
  return Boolean(ACCESS_KEY && SECRET_KEY);
}

function getClient(): S3Client {
  if (!_client) {
    _client = new S3Client({
      endpoint: ENDPOINT,
      region: REGION,
      credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
      forcePathStyle: true,
    });
  }
  return _client;
}

/**
 * Конвертирует буфер в WebP и загружает в S3.
 * Возвращает размер итогового файла в байтах.
 */
export async function uploadPhoto(s3Key: string, buffer: Buffer, mimeType: string): Promise<number> {
  // Конвертируем в WebP через sharp (качество 85)
  const webpBuffer = await sharp(buffer)
    .rotate() // применяем EXIF-ориентацию
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  await getClient().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: webpBuffer,
      ContentType: "image/webp",
      // Приватный объект — доступ только через сервер
    }),
  );

  return webpBuffer.length;
}

/**
 * Скачивает объект из S3 и возвращает буфер.
 */
export async function downloadPhoto(s3Key: string): Promise<Buffer> {
  const resp = await getClient().send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
    }),
  );

  if (!resp.Body) throw new Error("Empty S3 response body");

  // Конвертируем Readable Stream в Buffer
  const chunks: Buffer[] = [];
  for await (const chunk of resp.Body as Readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Удаляет объект из S3.
 */
export async function deleteFromS3(s3Key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
    }),
  );
}

/**
 * Формирует S3 key для фотографии.
 */
export function buildPhotoKey(userId: number, photoId: string): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `photos/${userId}/${year}/${month}/${photoId}.webp`;
}
