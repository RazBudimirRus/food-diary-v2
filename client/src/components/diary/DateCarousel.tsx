// DateCarousel.tsx — date navigation bar (prev/next arrows + date display).
// Extracted verbatim from DiaryPage.tsx header row 2 (29.4 refactor).
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateWithWeekday, mskToday } from "@/lib/diary-utils";

interface DateCarouselProps {
  date: string;
  onPrev: () => void;
  onNext: () => void;
  isToday: boolean;
}

/** Date navigation bar shown in the diary header (row 2): prev/next day arrows
 * plus the current date label ("Сегодня" or weekday · DD.MM). Next is disabled
 * once `date` reaches today (MSK), matching original DiaryPage behavior. */
export function DateCarousel({ date, onPrev, onNext, isToday }: DateCarouselProps) {
  return (
    <div className="flex items-center justify-center gap-1 pb-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrev} data-testid="btn-prev-day">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <button
        className="text-sm font-medium px-2 py-1 rounded hover:bg-secondary transition-colors"
        data-testid="btn-date-label"
      >
        {isToday ? "Сегодня" : formatDateWithWeekday(date)}
        {isToday && <span className="text-xs text-muted-foreground ml-1">({formatDateWithWeekday(date)})</span>}
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onNext}
        disabled={date >= mskToday()}
        data-testid="btn-next-day"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
