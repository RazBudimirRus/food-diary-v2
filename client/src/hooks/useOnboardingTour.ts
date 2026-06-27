import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "food_diary_onboarding_done";

export function useOnboardingTour() {
  const [step, setStep] = useState<number>(0); // 0 = not started / done
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Show tour only on first-ever visit (localStorage flag)
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Small delay so page renders first
      const t = setTimeout(() => { setStep(1); setActive(true); }, 800);
      return () => clearTimeout(t);
    }
  }, []);

  const next = useCallback(() => {
    setStep(s => {
      if (s >= 3) {
        setActive(false);
        localStorage.setItem(STORAGE_KEY, "1");
        return 0;
      }
      return s + 1;
    });
  }, []);

  const skip = useCallback(() => {
    setActive(false);
    setStep(0);
    localStorage.setItem(STORAGE_KEY, "1");
  }, []);

  return { step, active, next, skip };
}
