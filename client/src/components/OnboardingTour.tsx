import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface TourStep {
  title: string;
  body: string;
  emoji: string;
  /** data-testid of element to highlight, or null for centered modal */
  targetId?: string | null;
}

const STEPS: TourStep[] = [
  {
    emoji: "👋",
    title: "Добро пожаловать в Дневник питания",
    body: "Здесь вы фиксируете каждый приём пищи — время, продукты, уровень голода и воду. Данные отправляются врачу в Excel одним кликом.",
    targetId: null,
  },
  {
    emoji: "➕",
    title: "Добавьте первый приём",
    body: 'Нажмите кнопку "+ Добавить приём" внизу, или просто нажмите клавишу N на клавиатуре.',
    targetId: "btn-add-meal",
  },
  {
    emoji: "📊",
    title: "Скачивайте отчёт",
    body: 'Кнопка "Отчёт" в шапке формирует Excel-файл за выбранный день. Быстрый способ — клавиша R.',
    targetId: "btn-download-report",
  },
];

interface Props {
  step: number; // 1-based, 0 = hidden
  active: boolean;
  onNext: () => void;
  onSkip: () => void;
}

export function OnboardingTour({ step, active, onNext, onSkip }: Props) {
  if (!active || step === 0) return null;

  const current = STEPS[step - 1];
  const isLast = step === STEPS.length;

  return (
    <AnimatePresence>
      {active && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
            onClick={onSkip}
          />

          {/* Card */}
          <motion.div
            key={`step-${step}`}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed z-50
                       bottom-4 left-3 right-3
                       sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2
                       sm:w-[360px]
                       bg-card border rounded-2xl shadow-2xl p-6"
          >
            {/* Close */}
            <button
              onClick={onSkip}
              className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Закрыть подсказку"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Emoji */}
            <div className="text-3xl mb-3">{current.emoji}</div>

            {/* Title */}
            <h3 className="font-semibold text-base mb-2 pr-4">{current.title}</h3>

            {/* Body */}
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{current.body}</p>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3">
              {/* Step dots */}
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i + 1 === step
                        ? "w-4 bg-primary"
                        : i + 1 < step
                          ? "w-1.5 bg-primary/40"
                          : "w-1.5 bg-muted-foreground/20"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {!isLast && (
                  <button
                    onClick={onSkip}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
                  >
                    Пропустить
                  </button>
                )}
                <Button size="sm" onClick={onNext} data-testid={`btn-onboarding-${isLast ? "done" : "next"}`}>
                  {isLast ? "Готово" : "Далее →"}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
