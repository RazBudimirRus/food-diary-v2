import { useCallback, useEffect, useRef } from "react";

const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "touchstart", "scroll"] as const;

function readMinutes(name: string, fallback: number) {
  const raw = import.meta.env[name];
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const DEFAULT_WARNING_MIN = readMinutes("VITE_SESSION_IDLE_WARNING_MIN", 25);
const DEFAULT_TIMEOUT_MIN = readMinutes("VITE_SESSION_IDLE_TIMEOUT_MIN", 30);

export function useIdleTimer(
  onWarning: () => void,
  onTimeout: () => void,
  warningMin = DEFAULT_WARNING_MIN,
  timeoutMin = DEFAULT_TIMEOUT_MIN,
) {
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (timeoutTimer.current) clearTimeout(timeoutTimer.current);

    warningTimer.current = setTimeout(onWarning, warningMin * 60 * 1000);
    timeoutTimer.current = setTimeout(onTimeout, timeoutMin * 60 * 1000);
  }, [onWarning, onTimeout, warningMin, timeoutMin]);

  useEffect(() => {
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, reset, { passive: true }));
    reset();

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, reset));
      if (warningTimer.current) clearTimeout(warningTimer.current);
      if (timeoutTimer.current) clearTimeout(timeoutTimer.current);
    };
  }, [reset]);
}
