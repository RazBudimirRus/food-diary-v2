/**
 * Vitest manual mock for server/deepseek.ts
 *
 * Usage in tests:
 *   vi.mock("../../server/deepseek");
 *
 * Returns fixed КБЖУ values so tests never hit the real DeepSeek API.
 * Override individual functions per-test with vi.mocked(analyzeNutrition).mockResolvedValue(...)
 */
import { vi } from "vitest";
import type { DeepSeekAnalysisResult } from "../deepseek";

/** Default fixed nutrition response for testing */
export const MOCK_NUTRITION: DeepSeekAnalysisResult = {
  calories: 450,
  protein: 35,
  fat: 12,
  carbs: 48,
  usage: {
    tokensIn: 120,
    tokensOut: 80,
    totalTokens: 200,
    costEstimate: 0.000145,
  },
};

export const initDeepSeekKey = vi.fn(() => undefined);

export const isDeepSeekAvailable = vi.fn(() => true);

export const analyzeNutrition = vi.fn(
  async (
    _foodText?: string,
    _drinkText?: string,
    _dietaryRestrictions?: string | null,
  ): Promise<DeepSeekAnalysisResult> => {
    return { ...MOCK_NUTRITION };
  },
);
