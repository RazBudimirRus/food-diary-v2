/**
 * PwaInstallBanner — shown when browser fires beforeinstallprompt (Android/Chrome).
 * For iOS Safari: shown as a one-time tip with manual instructions.
 */
import { AnimatePresence, motion } from "framer-motion";
import { Download, X, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  show: boolean;
  isIos: boolean;
  canInstall: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export function PwaInstallBanner({ show, isIos, canInstall, onInstall, onDismiss }: Props) {
  if (!show && !isIos) return null;
  const visible = show || isIos;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="pwa-banner"
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 48 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-16 sm:bottom-4 left-3 right-3 z-40 max-w-sm mx-auto
                     bg-card border rounded-2xl shadow-xl px-4 py-3.5 flex items-start gap-3"
          style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {/* Icon */}
          <div className="shrink-0 mt-0.5 w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            {isIos
              ? <Share className="h-4 w-4 text-primary" />
              : <Download className="h-4 w-4 text-primary" />
            }
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Добавить на экран</p>
            {isIos ? (
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Нажмите <span className="font-medium">Поделиться</span> → <span className="font-medium">На экран «Домой»</span> — и приложение будет работать как нативное.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                Установите как приложение — быстрый доступ без браузера.
              </p>
            )}
            {canInstall && !isIos && (
              <Button size="sm" className="mt-2 h-8 text-xs" onClick={onInstall}>
                Установить
              </Button>
            )}
          </div>

          {/* Close */}
          <button
            onClick={onDismiss}
            className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
