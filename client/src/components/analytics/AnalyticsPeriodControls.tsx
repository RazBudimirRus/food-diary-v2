import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type AnalyticsPeriodType, formatAnalyticsPeriodLabel, mskToday } from "@shared/dates";

const PERIODS: { label: string; type: AnalyticsPeriodType }[] = [
  { label: "Неделя", type: "week" },
  { label: "Месяц", type: "month" },
  { label: "3 мес", type: "quarter" },
  { label: "6 мес", type: "half" },
  { label: "Год", type: "year" },
];

interface AnalyticsPeriodControlsProps {
  periodType: AnalyticsPeriodType;
  onSelectPeriod: (type: AnalyticsPeriodType) => void;
  onShiftPeriod: (delta: -1 | 1) => void;
  rangeFrom: string;
  rangeTo: string;
}

export function AnalyticsPeriodControls({
  periodType,
  onSelectPeriod,
  onShiftPeriod,
  rangeFrom,
  rangeTo,
}: AnalyticsPeriodControlsProps) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((period) => (
          <Button
            key={period.type}
            variant={periodType === period.type ? "default" : "outline"}
            size="sm"
            onClick={() => onSelectPeriod(period.type)}
            data-testid={`btn-analytics-period-${period.type}`}
          >
            {period.label}
          </Button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" onClick={() => onShiftPeriod(-1)} data-testid="btn-analytics-prev">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium text-center" data-testid="analytics-period-label">
          {formatAnalyticsPeriodLabel(periodType, rangeFrom, rangeTo)}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onShiftPeriod(1)}
          disabled={rangeTo >= mskToday()}
          data-testid="btn-analytics-next"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}
