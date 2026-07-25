/**
 * use-photo-url.ts — загружает фото через apiRequest (с авторизацией и
 * авто-рефрешем токена) и возвращает временный blob: URL.
 *
 * Почему blob, а не ?token= в src:
 * - access token живёт 30 мин; после истечения <img src="?token=..."> даёт 401
 * - apiRequest автоматически вызывает refreshAccessToken при 401 и повторяет запрос
 * - blob: URL не протухает — создаётся при монтировании с актуальным токеном
 */
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";

export function usePhotoUrl(photoId: string | null): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photoId) {
      setBlobUrl(null);
      return;
    }

    let revoked = false;
    let currentUrl: string | null = null;

    apiRequest("GET", `/api/photos/${photoId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`photo ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (revoked) return;
        const url = URL.createObjectURL(blob);
        currentUrl = url;
        setBlobUrl(url);
      })
      .catch(() => {
        if (!revoked) setBlobUrl(null);
      });

    return () => {
      revoked = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [photoId]);

  return blobUrl;
}
