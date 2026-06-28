/**
 * deepseek.ts — DeepSeek API integration for КБЖУ (nutrition) analysis.
 *
 * Security model:
 * - API key is read from DEEPSEEK_API_KEY env var at startup.
 * - It is immediately encrypted with AES-256-GCM and stored in the secrets table
 *   under the system key "__deepseek_api_key__" (userId = 0, a system slot).
 * - The plaintext key is never stored anywhere — only the encrypted blob lives in DB.
 * - On each request the key is decrypted from DB in memory and used for the HTTP call.
 * - The key is NEVER sent to the frontend or logged.
 */

import { encryptSecret, decryptSecret } from "./auth";
import { storage } from "./storage";
import type { NutritionResult } from "@shared/schema";

// System user ID for global (non-user-scoped) secrets
const SYSTEM_USER_ID = 0;
const DEEPSEEK_KEY_NAME = "__deepseek_api_key__";
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const INPUT_USD_PER_M_TOKENS = Number(process.env.DEEPSEEK_INPUT_USD_PER_M_TOKENS ?? "0.27");
const OUTPUT_USD_PER_M_TOKENS = Number(process.env.DEEPSEEK_OUTPUT_USD_PER_M_TOKENS ?? "1.10");

export interface DeepSeekAnalysisResult extends NutritionResult {
  usage?: {
    tokensIn: number;
    tokensOut: number;
    totalTokens: number;
    costEstimate: number;
  };
}

// ── Init: load key from env, encrypt, store in DB ─────────────────────────────

export function initDeepSeekKey(): void {
  const rawKey = process.env.DEEPSEEK_API_KEY;
  if (!rawKey) {
    console.warn("[deepseek] DEEPSEEK_API_KEY not set — КБЖУ analysis will be unavailable");
    return;
  }
  // Encrypt and upsert into secrets table
  const { encryptedValue, iv } = encryptSecret(rawKey);
  storage.setSecret(SYSTEM_USER_ID, DEEPSEEK_KEY_NAME, encryptedValue, iv);
  console.info("[deepseek] API key loaded and stored encrypted in DB");
}

// ── Internal: decrypt key from DB ─────────────────────────────────────────────

function getDeepSeekKey(): string | null {
  const secret = storage.getSecret(SYSTEM_USER_ID, DEEPSEEK_KEY_NAME);
  if (!secret) return null;
  try {
    return decryptSecret(secret.encryptedValue, secret.iv);
  } catch {
    console.error("[deepseek] Failed to decrypt API key");
    return null;
  }
}

// ── Public: check availability ────────────────────────────────────────────────

export function isDeepSeekAvailable(): boolean {
  return storage.getSecret(SYSTEM_USER_ID, DEEPSEEK_KEY_NAME) !== undefined;
}

// ── Public: analyze nutrition ─────────────────────────────────────────────────

export async function analyzeNutrition(
  foodText?: string,
  drinkText?: string,
  dietaryRestrictions?: string | null,
): Promise<DeepSeekAnalysisResult> {
  const apiKey = getDeepSeekKey();
  if (!apiKey) {
    throw new Error("DeepSeek API ключ не настроен. Добавьте DEEPSEEK_API_KEY в .env");
  }

  if (!foodText && !drinkText) {
    throw new Error("Укажите еду или напитки для анализа");
  }

  const parts: string[] = [];
  if (foodText) parts.push(`Еда: ${foodText}`);
  if (drinkText) parts.push(`Напитки: ${drinkText}`);
  const userInput = parts.join("\n");

  // Формируем секцию с ограничениями питания (Phase 20)
  const restrictionsSection = dietaryRestrictions
    ? `\nОграничения питания пользователя: ${dietaryRestrictions}\nУчитывай их при анализе и в примечании.\n`
    : "";

  const prompt = `Ты диетолог-аналитик. Оцени калорийность и нутриенты приёма пищи.${restrictionsSection}

Пользователь написал:
${userInput}

Ответь СТРОГО в формате JSON (без markdown, без пояснений вне JSON):
{
  "calories": <число ккал, целое>,
  "protein": <белки в граммах, одно десятичное>,
  "fat": <жиры в граммах, одно десятичное>,
  "carbs": <углеводы в граммах, одно десятичное>,
  "note": "<краткое пояснение по оценке, 1-2 предложения>"
}

Если точное количество неизвестно — дай среднюю оценку. Напитки (чай, кофе без добавок) — 0 ккал.`;

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };

  const content = data.choices?.[0]?.message?.content ?? "";

  // Extract JSON from response (may have markdown fences)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("DeepSeek вернул неожиданный формат ответа");
  }

  const parsed = JSON.parse(jsonMatch[0]) as NutritionResult;

  // Validate and sanitize
  const tokensIn = Number(data.usage?.prompt_tokens ?? 0);
  const tokensOut = Number(data.usage?.completion_tokens ?? 0);
  const totalTokens = Number(data.usage?.total_tokens ?? tokensIn + tokensOut);
  const costEstimate =
    (tokensIn / 1_000_000) * INPUT_USD_PER_M_TOKENS + (tokensOut / 1_000_000) * OUTPUT_USD_PER_M_TOKENS;

  return {
    calories: Math.round(Number(parsed.calories) || 0),
    protein: Math.round((Number(parsed.protein) || 0) * 10) / 10,
    fat: Math.round((Number(parsed.fat) || 0) * 10) / 10,
    carbs: Math.round((Number(parsed.carbs) || 0) * 10) / 10,
    note: typeof parsed.note === "string" ? parsed.note.slice(0, 300) : undefined,
    usage:
      totalTokens > 0
        ? {
            tokensIn,
            tokensOut,
            totalTokens,
            costEstimate: Math.round(costEstimate * 1_000_000) / 1_000_000,
          }
        : undefined,
  };
}
