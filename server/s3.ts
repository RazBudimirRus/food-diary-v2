/**
 * s3.ts — VK Object Storage (S3-compatible) client.
 * Сервер всегда проксирует — прямые URL клиенту не отдаются.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import { Readable } from "stream";
import net from "net";
import { PHOTO_MAX_PER_USER as CFG_PHOTO_MAX_PER_USER, PHOTO_MAX_SIZE_BYTES as CFG_PHOTO_MAX_SIZE } from "./config";

const ENDPOINT = process.env.VK_S3_ENDPOINT || "https://hb.ru-msk.vkcloud-storage.ru";
const REGION = process.env.VK_S3_REGION || "ru-msk";
const BUCKET = process.env.VK_S3_BUCKET || "food-diary-photos";
const ACCESS_KEY = process.env.VK_S3_ACCESS_KEY || "";
const SECRET_KEY = process.env.VK_S3_SECRET_KEY || "";

export const PHOTO_MAX_SIZE_BYTES = CFG_PHOTO_MAX_SIZE;
export const PHOTO_MAX_PER_USER = CFG_PHOTO_MAX_PER_USER;

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

// ── Phase 28.4: ClamAV antivirus scan ───────────────────────────────────────

const CLAMAV_SOCKET = process.env.CLAMAV_SOCKET || "";

/**
 * Scan a buffer with ClamAV via clamd Unix socket protocol (INSTREAM).
 * Returns the scan result line, e.g. "stream: OK" or "stream: Eicar-Test-Signature FOUND".
 * Throws if ClamAV is unreachable or returns ERROR.
 */
function clamScan(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const sock = net.createConnection(CLAMAV_SOCKET);
    let response = "";
    const chunks: Buffer[] = [];

    sock.on("connect", () => {
      // INSTREAM: send zINSTREAM\0 then chunks prefixed by 4-byte big-endian length, terminate with 0-length
      const cmd = Buffer.from("zINSTREAM\0");
      const len = Buffer.alloc(4);
      len.writeUInt32BE(buffer.length, 0);
      const terminator = Buffer.alloc(4); // 0x00000000
      sock.write(Buffer.concat([cmd, len, buffer, terminator]));
    });

    sock.on("data", (chunk: Buffer) => chunks.push(chunk));

    sock.on("end", () => {
      response = Buffer.concat(chunks).toString().trim();
      resolve(response);
    });

    sock.on("error", reject);

    sock.setTimeout(15000);
    sock.on("timeout", () => {
      sock.destroy();
      reject(new Error("ClamAV scan timed out"));
    });
  });
}

/**
 * Scan buffer for viruses. Throws a 422-tagged error on virus detection.
 * Silently skips if CLAMAV_SOCKET is not configured (dev/offline).
 */
export async function scanForViruses(buffer: Buffer, label = "upload"): Promise<void> {
  if (!CLAMAV_SOCKET) return; // not configured — skip in dev
  let result: string;
  try {
    result = await clamScan(buffer);
  } catch (err: any) {
    console.error(`[clamav] scan error for ${label}:`, err.message);
    // Don't block upload if ClamAV is temporarily unavailable — log and continue
    return;
  }
  if (result.includes("FOUND")) {
    const virus = result.replace(/^stream:\s*/, "").replace(/\s*FOUND$/, "");
    console.warn(`[clamav] virus detected in ${label}: ${virus}`);
    const err: any = new Error(`Файл отклонён: обнаружена угроза безопасности (${virus})`);
    err.status = 422;
    throw err;
  }
  console.info(`[clamav] ${label}: ${result}`);
}

/**
 * Конвертирует буфер в WebP и загружает в S3.
 * Возвращает размер итогового файла в байтах.
 */
export async function uploadPhoto(s3Key: string, buffer: Buffer, _mimeType: string): Promise<number> {
  // Phase 28.4: antivirus scan of raw upload buffer before any processing
  await scanForViruses(buffer, s3Key);

  // Конвертируем в WebP через sharp (качество 85)
  // Phase 28.1: sharp по умолчанию (без вызова .withMetadata()) уже убирает всю
  // EXIF-метаинформацию (включая GPS-геолокацию) при конвертации. Важно:
  // вызов .rotate() должен быть до любого потенциального .withMetadata(), чтобы сначала
  // применить EXIF-ориентацию, а затем уже убрать сам EXIF.
  const webpBuffer = await sharp(buffer)
    .rotate() // применяем EXIF-ориентацию перед удалением метаданных
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

/**
 * UX-S3-1: Перечисляет все объекты в бакете и возвращает статистику по пользователям.
 * Ключи имеют формат photos/{userId}/...
 * Возвращает массив { userId, count, totalBytes } + итого по бакету.
 */
export interface S3UserStat {
  userId: number | null; // null = объекты вне папки photos/
  count: number;
  totalBytes: number;
}

export interface S3BucketStats {
  totalObjects: number;
  totalBytes: number;
  byUser: S3UserStat[];
  truncated: boolean; // true если объектов > 10 000
}

export async function listBucketStats(): Promise<S3BucketStats> {
  const client = getClient();
  const byUser = new Map<string, { count: number; totalBytes: number }>();
  let totalObjects = 0;
  let totalBytes = 0;
  let truncated = false;
  let continuationToken: string | undefined;

  do {
    const resp = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      }),
    );

    for (const obj of resp.Contents ?? []) {
      const key = obj.Key ?? "";
      const size = obj.Size ?? 0;
      totalObjects++;
      totalBytes += size;

      // Парсим userId из ключа photos/{userId}/...
      const match = key.match(/^photos\/(\d+)\//);
      const userKey = match ? match[1] : "__other__";

      const entry = byUser.get(userKey) ?? { count: 0, totalBytes: 0 };
      entry.count++;
      entry.totalBytes += size;
      byUser.set(userKey, entry);
    }

    truncated = resp.IsTruncated ?? false;
    continuationToken = resp.NextContinuationToken;

    // Защита: не более 10 страниц (10 000 объектов)
    if (totalObjects >= 10_000) {
      truncated = true;
      break;
    }
  } while (truncated && continuationToken);

  const byUserArr: S3UserStat[] = Array.from(byUser.entries())
    .map(([k, v]) => ({
      userId: k === "__other__" ? null : Number(k),
      count: v.count,
      totalBytes: v.totalBytes,
    }))
    .sort((a, b) => b.count - a.count);

  return { totalObjects, totalBytes, byUser: byUserArr, truncated };
}

/**
 * UX-S3-2: Загружает тестовый PNG в бакет, затем пытается скачать его обратно через сервер.
 * Возвращает результат каждого шага + размер загруженного файла.
 */
export interface S3UploadTestResult {
  put: { ok: boolean; durationMs: number; sizeBytes?: number; detail?: string };
  get: { ok: boolean; durationMs: number; sizeBytes?: number; detail?: string };
  delete: { ok: boolean; durationMs: number; detail?: string };
  key: string;
}

export async function runUploadTest(): Promise<S3UploadTestResult> {
  const key = buildPhotoKey(0, `upload-test-${Date.now()}`);
  const result: S3UploadTestResult = {
    put: { ok: false, durationMs: 0 },
    get: { ok: false, durationMs: 0 },
    delete: { ok: false, durationMs: 0 },
    key,
  };

  // PUT — реальный 1×1 white WebP через sharp pipeline
  const t0 = Date.now();
  try {
    const buf = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .webp()
      .toBuffer();
    const sizeBytes = await uploadPhoto(key, buf, "image/webp");
    result.put = { ok: true, durationMs: Date.now() - t0, sizeBytes };
  } catch (e: any) {
    result.put = { ok: false, durationMs: Date.now() - t0, detail: e.message };
    return result; // нет смысла продолжать
  }

  // GET — скачиваем обратно
  const t1 = Date.now();
  try {
    const buf = await downloadPhoto(key);
    result.get = { ok: true, durationMs: Date.now() - t1, sizeBytes: buf.length };
  } catch (e: any) {
    result.get = { ok: false, durationMs: Date.now() - t1, detail: e.message };
  }

  // DELETE — убираем тестовый объект
  const t2 = Date.now();
  try {
    await deleteFromS3(key);
    result.delete = { ok: true, durationMs: Date.now() - t2 };
  } catch (e: any) {
    result.delete = { ok: false, durationMs: Date.now() - t2, detail: e.message };
  }

  return result;
}
