/**
 * Phase 35 — Unit tests for server/deepseek.ts
 * Mocks storage and fetch to test all code paths without real API calls.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Hoist mocks so they're available before module load
const { mockGetSecret, mockSetSecret, mockEncryptSecret, mockDecryptSecret } = vi.hoisted(() => {
  const mockGetSecret = vi.fn();
  const mockSetSecret = vi.fn();
  const mockEncryptSecret = vi.fn().mockReturnValue({ encryptedValue: "enc", iv: "iv123" });
  const mockDecryptSecret = vi.fn().mockReturnValue("sk-test-key-123");
  return { mockGetSecret, mockSetSecret, mockEncryptSecret, mockDecryptSecret };
});

vi.mock("../../server/storage", () => ({
  storage: {
    getSecret: mockGetSecret,
    setSecret: mockSetSecret,
  },
}));

vi.mock("../../server/auth", () => ({
  encryptSecret: mockEncryptSecret,
  decryptSecret: mockDecryptSecret,
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { initDeepSeekKey, isDeepSeekAvailable, analyzeNutrition } from "../../server/deepseek";

const MOCK_SECRET = { encryptedValue: "enc", iv: "iv123" };

function mockSuccessResponse(
  content: string,
  usage = { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [{ message: { content } }],
      usage,
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.DEEPSEEK_API_KEY;
});

afterEach(() => {
  delete process.env.DEEPSEEK_API_KEY;
});

describe("initDeepSeekKey", () => {
  it("logs warning and returns early when DEEPSEEK_API_KEY not set", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    initDeepSeekKey();
    expect(mockSetSecret).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("DEEPSEEK_API_KEY not set"));
    warnSpy.mockRestore();
  });

  it("encrypts and stores key when DEEPSEEK_API_KEY is set", () => {
    process.env.DEEPSEEK_API_KEY = "sk-test-key";
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    initDeepSeekKey();
    expect(mockEncryptSecret).toHaveBeenCalledWith("sk-test-key");
    expect(mockSetSecret).toHaveBeenCalledWith(0, "__deepseek_api_key__", "enc", "iv123");
    infoSpy.mockRestore();
  });
});

describe("isDeepSeekAvailable", () => {
  it("returns false when secret not in DB", () => {
    mockGetSecret.mockReturnValue(undefined);
    expect(isDeepSeekAvailable()).toBe(false);
  });

  it("returns true when secret exists in DB", () => {
    mockGetSecret.mockReturnValue(MOCK_SECRET);
    expect(isDeepSeekAvailable()).toBe(true);
  });
});

describe("analyzeNutrition", () => {
  it("throws when no API key in DB", async () => {
    mockGetSecret.mockReturnValue(undefined);
    await expect(analyzeNutrition("Гречка")).rejects.toThrow("DeepSeek API ключ не настроен");
  });

  it("throws when no food or drink text provided", async () => {
    mockGetSecret.mockReturnValue(MOCK_SECRET);
    await expect(analyzeNutrition()).rejects.toThrow("Укажите еду или напитки");
  });

  it("throws when only empty strings provided", async () => {
    mockGetSecret.mockReturnValue(MOCK_SECRET);
    await expect(analyzeNutrition("", "")).rejects.toThrow("Укажите еду или напитки");
  });

  it("throws on API error response", async () => {
    mockGetSecret.mockReturnValue(MOCK_SECRET);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => "Rate limit exceeded",
    });
    await expect(analyzeNutrition("Гречка")).rejects.toThrow("DeepSeek API error 429");
  });

  it("throws when response has no JSON object", async () => {
    mockGetSecret.mockReturnValue(MOCK_SECRET);
    mockSuccessResponse("Я не могу этого сделать. Вот ответ.");
    await expect(analyzeNutrition("Гречка")).rejects.toThrow("неожиданный формат");
  });

  it("parses valid JSON response and returns nutrition", async () => {
    mockGetSecret.mockReturnValue(MOCK_SECRET);
    const json = JSON.stringify({ calories: 330, protein: 12.5, fat: 3.2, carbs: 65.0, note: "Хорошо" });
    mockSuccessResponse(json);
    const result = await analyzeNutrition("Гречка");
    expect(result.calories).toBe(330);
    expect(result.protein).toBe(12.5);
    expect(result.fat).toBe(3.2);
    expect(result.carbs).toBe(65);
    expect(result.note).toBe("Хорошо");
  });

  it("parses JSON wrapped in markdown fences", async () => {
    mockGetSecret.mockReturnValue(MOCK_SECRET);
    const inner = JSON.stringify({ calories: 200, protein: 8, fat: 5, carbs: 30, note: "Ок" });
    mockSuccessResponse("```json\n" + inner + "\n```");
    const result = await analyzeNutrition("Суп");
    expect(result.calories).toBe(200);
  });

  it("includes usage stats when total_tokens > 0", async () => {
    mockGetSecret.mockReturnValue(MOCK_SECRET);
    const json = JSON.stringify({ calories: 100, protein: 5, fat: 2, carbs: 15 });
    mockSuccessResponse(json, { prompt_tokens: 200, completion_tokens: 100, total_tokens: 300 });
    const result = await analyzeNutrition("Яблоко");
    expect(result.usage).toBeDefined();
    expect(result.usage!.tokensIn).toBe(200);
    expect(result.usage!.tokensOut).toBe(100);
    expect(result.usage!.totalTokens).toBe(300);
    expect(result.usage!.costEstimate).toBeGreaterThan(0);
  });

  it("omits usage when total_tokens is 0", async () => {
    mockGetSecret.mockReturnValue(MOCK_SECRET);
    const json = JSON.stringify({ calories: 100, protein: 5, fat: 2, carbs: 15 });
    mockSuccessResponse(json, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 });
    const result = await analyzeNutrition("Яблоко");
    expect(result.usage).toBeUndefined();
  });

  it("handles food and drink together", async () => {
    mockGetSecret.mockReturnValue(MOCK_SECRET);
    const json = JSON.stringify({ calories: 50, protein: 1, fat: 0, carbs: 12 });
    mockSuccessResponse(json);
    const result = await analyzeNutrition("Яблоко", "Чай");
    expect(result.calories).toBe(50);
    // Verify prompt included both food and drink (in user message = messages[1])
    const fetchCall = mockFetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body as string) as { messages: Array<{ content: string }> };
    expect(body.messages[1].content).toContain("Еда: Яблоко");
    expect(body.messages[1].content).toContain("Напитки: Чай");
  });

  it("includes dietary restrictions in prompt when provided", async () => {
    mockGetSecret.mockReturnValue(MOCK_SECRET);
    const json = JSON.stringify({ calories: 200, protein: 10, fat: 5, carbs: 25 });
    mockSuccessResponse(json);
    await analyzeNutrition("Курица", undefined, "без лактозы");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as { messages: Array<{ content: string }> };
    // dietary restrictions are in user message = messages[1]
    expect(body.messages[1].content).toContain("без лактозы");
  });

  it("truncates note longer than 300 chars", async () => {
    mockGetSecret.mockReturnValue(MOCK_SECRET);
    const longNote = "А".repeat(400);
    const json = JSON.stringify({ calories: 100, protein: 5, fat: 2, carbs: 15, note: longNote });
    mockSuccessResponse(json);
    const result = await analyzeNutrition("Что-то");
    expect(result.note!.length).toBe(300);
  });

  it("rounds calories to integer", async () => {
    mockGetSecret.mockReturnValue(MOCK_SECRET);
    const json = JSON.stringify({ calories: 123.7, protein: 5, fat: 2, carbs: 15 });
    mockSuccessResponse(json);
    const result = await analyzeNutrition("Тест");
    expect(Number.isInteger(result.calories)).toBe(true);
    expect(result.calories).toBe(124);
  });

  it("handles missing optional fields gracefully", async () => {
    mockGetSecret.mockReturnValue(MOCK_SECRET);
    const json = JSON.stringify({ calories: 100 });
    mockSuccessResponse(json);
    const result = await analyzeNutrition("Тест");
    expect(result.protein).toBe(0);
    expect(result.fat).toBe(0);
    expect(result.carbs).toBe(0);
    expect(result.note).toBeUndefined();
  });
});

// ── PERF-01: request options that keep КБЖУ fast ─────────────────────────────

describe("analyzeNutrition — PERF-01 request options", () => {
  function bodyOfLastCall() {
    return JSON.parse(mockFetch.mock.calls[0][1].body as string) as {
      model: string;
      thinking?: { type: string };
      response_format?: { type: string };
      temperature?: number;
      max_tokens?: number;
      max_completion_tokens?: number;
    };
  }

  beforeEach(() => {
    mockGetSecret.mockReturnValue(MOCK_SECRET);
    mockSuccessResponse(JSON.stringify({ calories: 100, protein: 5, fat: 2, carbs: 15 }));
  });

  it("disables thinking mode — the direct cause of the 5–15s wait", async () => {
    await analyzeNutrition("Гречка");
    expect(bodyOfLastCall().thinking).toEqual({ type: "disabled" });
  });

  it("requests JSON mode so the response needs no salvage parsing", async () => {
    await analyzeNutrition("Гречка");
    expect(bodyOfLastCall().response_format).toEqual({ type: "json_object" });
  });

  it("keeps temperature low — only effective while thinking is disabled", async () => {
    await analyzeNutrition("Гречка");
    expect(bodyOfLastCall().temperature).toBe(0.1);
  });

  it("keeps budgets generous so ignored thinking cannot starve the answer", async () => {
    await analyzeNutrition("Гречка");
    const body = bodyOfLastCall();
    expect(body.max_tokens).toBe(4000);
    expect(body.max_completion_tokens).toBe(512);
  });

  it("logs duration and reasoning_tokens for prod verification", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    await analyzeNutrition("Гречка");
    const logged = infoSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).toContain("thinking=disabled");
    expect(logged).toContain("reasoning_tokens=0");
    infoSpy.mockRestore();
  });

  it("reads reasoning_tokens from completion_tokens_details when present", async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ calories: 100 }) } }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 40,
          total_tokens: 50,
          completion_tokens_details: { reasoning_tokens: 128 },
        },
      }),
    });
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    await analyzeNutrition("Гречка");
    expect(infoSpy.mock.calls.map((c) => String(c[0])).join("\n")).toContain("reasoning_tokens=128");
    infoSpy.mockRestore();
  });
});
