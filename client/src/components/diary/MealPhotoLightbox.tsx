import { usePhotoUrl } from "@/hooks/use-photo-url";

/** Загружает фото через apiRequest → blob URL (токен не протухает). */
export function MealPhotoThumb({ id, onClick }: { id: string; onClick: () => void }) {
  const src = usePhotoUrl(id);
  return (
    <button
      type="button"
      className="w-14 h-14 rounded-md border overflow-hidden hover:opacity-80 transition-opacity bg-muted flex items-center justify-center"
      onClick={onClick}
      title="Открыть фото"
    >
      {src ? (
        <img src={src} alt="Фото блюда" className="w-full h-full object-cover" />
      ) : (
        <span className="text-xs text-muted-foreground">...</span>
      )}
    </button>
  );
}

export function MealPhotoLightbox({
  id,
  onClose,
  onDelete,
}: {
  id: string;
  onClose: () => void;
  onDelete: () => void;
}) {
  const src = usePhotoUrl(id);
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={onClose}>
      {src ? (
        <img
          src={src}
          alt="Фото"
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="text-white text-sm">Загрузка...</span>
      )}
      <button
        className="absolute top-4 right-4 text-white text-2xl font-bold leading-none"
        onClick={onClose}
        aria-label="Закрыть"
      >
        ×
      </button>
      <button
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-lg bg-destructive/90 hover:bg-destructive px-4 py-2 text-sm font-medium text-white transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label="Удалить фото"
      >
        🗑 Удалить фото
      </button>
    </div>
  );
}
