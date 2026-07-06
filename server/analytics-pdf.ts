/**
 * UX-22 / UX-22b: Analytics PDF export
 * Generates a multi-page PDF (7+ pages) with:
 *   Page 1 — Cover + period summary KPIs + macros + hunger/satiety
 *   Page 2 — Sleep block (chart + stats)
 *   Page 3 — Calories + КБЖУ block (charts + stats)
 *   Page 4 — Meal timing block (charts + stats)
 *   Page 5 — Hunger / satiety block (charts + stats)
 *   Page 6 — Activity block (chart + stats)
 *   Page 7 — Additional metrics (skipped meals, contexts, water sparkline)
 *   Page 8+ — Per-day table
 *
 * Uses pdfkit with embedded Inter TTF (with full Cyrillic support) for text,
 * and chartjs-node-canvas (headless Chart.js via node-canvas) for real charts.
 * Fonts are downloaded on first use from Google Fonts and cached in DATA_DIR/fonts/.
 */
import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import type { Day, Meal } from "@shared/schema";
// @ts-expect-error - chartjs-node-canvas types may not resolve perfectly in all environments
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { Chart } from "chart.js";
import type { ChartConfiguration } from "chart.js";

// ── Font download + cache ──────────────────────────────────────────────────────

const DATA_DIR = process.env.SQLITE_DB_PATH
  ? path.dirname(process.env.SQLITE_DB_PATH)
  : path.join(process.cwd(), "data");

const FONT_CACHE_DIR = path.join(DATA_DIR, "fonts");

// Inter TTF fonts (Latin + Cyrillic) — bundled in Docker image via Dockerfile.api COPY
// Fallback: runtime download from GitHub, then Helvetica (ASCII only) if all else fails

const LOCAL_FONT_DIRS = [
  path.join(process.cwd(), "server", "fonts"), // dev
  path.join(__dirname, "fonts"), // dist (if __dirname works)
  path.join(process.cwd(), "dist", "fonts"), // dist alt
  FONT_CACHE_DIR, // data/fonts cache
];

function findFontFile(name: string): string | null {
  for (const dir of LOCAL_FONT_DIRS) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
}

// Resolved font paths (populated on first call to resolveFonts)
let fontRegular: string | null = null;
let fontBold: string | null = null;
let fontsReady = false;

/**
 * Resolve Inter TTF font paths. Priority:
 *  1. Local server/fonts/ directory (dev)
 *  2. data/fonts/ cache directory (Docker persistent volume)
 *  3. Download from GitHub releases (inter v4 TTF)
 *  4. Fall back to null → pdfkit uses Helvetica (ASCII only)
 */
async function resolveFonts(): Promise<void> {
  if (fontsReady) return;

  // Priority 1: local files (dev / Docker build with COPY)
  fontRegular = findFontFile("Inter-Regular.ttf");
  fontBold = findFontFile("Inter-Bold.ttf");

  if (fontRegular && fontBold) {
    fontsReady = true;
    return;
  }

  // Priority 2: download from GitHub (inter v4 TTF — known stable URLs)
  const GITHUB_INTER = "https://github.com/rsms/inter/raw/refs/heads/master/extras/ttf";
  const targets: Array<{ name: string; url: string; dest: string }> = [];

  fs.mkdirSync(FONT_CACHE_DIR, { recursive: true });

  if (!fontRegular) {
    const dest = path.join(FONT_CACHE_DIR, "Inter-Regular.ttf");
    targets.push({
      name: "Inter-Regular.ttf",
      url: `${GITHUB_INTER}/Inter-Regular.ttf`,
      dest,
    });
  }
  if (!fontBold) {
    const dest = path.join(FONT_CACHE_DIR, "Inter-Bold.ttf");
    targets.push({
      name: "Inter-Bold.ttf",
      url: `${GITHUB_INTER}/Inter-Bold.ttf`,
      dest,
    });
  }

  await Promise.all(
    targets.map(async ({ url, dest }) => {
      try {
        await downloadFile(url, dest);
      } catch (e) {
        console.warn(`[analytics-pdf] Font download failed: ${url}`, e);
      }
    }),
  );

  fontRegular = findFontFile("Inter-Regular.ttf");
  fontBold = findFontFile("Inter-Bold.ttf");
  fontsReady = true;
}

// ── Colors ────────────────────────────────────────────────────────────────────

const TEAL = "#01696F";
const DARK = "#28251D";
const MUTED = "#7A7974";
const BORDER = "#D4D1CA";
const BG_LIGHT = "#F7F6F2";
const WHITE = "#FFFFFF";

// Chart-specific colors (per ROADMAP)
const C_WAKE = "#16a34a"; // Сон подъём
const C_SLEEP = "#7C3AED"; // Сон отбой
const C_KCAL_BAR = "#9ca3af"; // Ккал бары
const C_MOVING_AVG = "#f59e0b"; // Скользящее среднее 7д
const C_PROTEIN = "#16a34a"; // Белки
const C_FAT = "#f59e0b"; // Жиры
const C_CARBS = "#3b82f6"; // Углеводы
const C_HUNGER = "#f59e0b"; // Голод до
const C_SATIETY = "#16a34a"; // Насыщение после
const C_STEPS = "#38bdf8"; // Шаги
const C_GAP_LONG = "#ef4444"; // Перерыв >5ч
const C_GAP_NORMAL = "#3b82f6"; // норма
const C_GRID = "#e5e7eb";

const MARGIN = 40;
const PAGE_WIDTH = 595; // A4
const PAGE_HEIGHT = 842; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// ── Chart.js global defaults ────────────────────────────────────────────────────

Chart.defaults.font.family = "sans-serif";
Chart.defaults.font.size = 10;

// ── Chart render helper ──────────────────────────────────────────────────────

async function renderChart(config: ChartConfiguration, width: number, height: number): Promise<Buffer> {
  const canvas = new ChartJSNodeCanvas({ width, height, backgroundColour: "white" });
  return canvas.renderToBuffer(config as any);
}

// ── Data helpers ──────────────────────────────────────────────────────────────

function totalWaterL(meals: Meal[]): number {
  return (
    meals.reduce((sum, m) => {
      const ml = m.waterMl ?? (m.waterUnits ?? 0) * 500;
      return sum + ml;
    }, 0) / 1000
  );
}

function sumField(meals: Meal[], field: "calories" | "protein" | "fat" | "carbs"): number | null {
  const vals = meals.map((m) => m[field]).filter((v): v is number => v != null && !isNaN(v));
  if (!vals.length) return null;
  return vals.reduce((s, v) => s + v, 0);
}

function avg(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (!nums.length) return null;
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

function fmtNum(v: number | null, decimals = 0): string {
  if (v == null) return "—";
  return decimals === 0 ? String(Math.round(v)) : v.toFixed(decimals);
}

function fmtDateShort(d: string): string {
  const [, m, day] = d.split("-");
  return `${day}.${m}`;
}

function ruDate(d: string): string {
  const months = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
  ];
  const [y, m, day] = d.split("-");
  return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
}

/** Compute sleep duration in hours from wakeTime/sleepTime (HH:MM strings). */
function sleepDurationHours(day: Day): number | null {
  if (!day.wakeTime || !day.sleepTime) return null;
  const [wh, wm] = day.wakeTime.split(":").map(Number);
  const [sh, sm] = day.sleepTime.split(":").map(Number);
  const wake = wh + wm / 60;
  let sleep = sh + sm / 60;
  if (sleep > wake) sleep -= 24;
  const dur = wake - sleep;
  return dur > 0 && dur < 24 ? dur : null;
}

/** Convert "HH:MM" average of minutes back into "HH:MM" string. */
function minutesToHHMM(totalMinutes: number | null): string {
  if (totalMinutes == null || !isFinite(totalMinutes)) return "—";
  let m = Math.round(totalMinutes) % (24 * 60);
  if (m < 0) m += 24 * 60;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function timeStrToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Simple 7-day moving average over numeric series (nulls treated as gaps, skipped). */
function movingAverage7(values: (number | null)[]): (number | null)[] {
  const window = 7;
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1).filter((v): v is number => v != null && v > 0);
    if (!slice.length) return null;
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  });
}

function buildHistogram11(values: number[]): number[] {
  const bins = new Array(11).fill(0);
  for (const v of values) {
    const r = Math.round(v);
    if (r >= 0 && r <= 10) bins[r] += 1;
  }
  return bins;
}

// ── pdfkit font helper ────────────────────────────────────────────────────────

function _useFont(doc: InstanceType<typeof PDFDocument>, bold = false): string {
  const name = bold ? "Inter-Bold" : "Inter-Regular";
  // pdfkit font() is called separately — we just return the registered name
  return name;
}

// ── Footer ────────────────────────────────────────────────────────────────────

function drawFooter(
  doc: InstanceType<typeof PDFDocument>,
  pageNum: number,
  from: string,
  to: string,
  hasCyrillic: boolean,
) {
  const footerY = PAGE_HEIGHT - 28;
  doc.rect(0, footerY, PAGE_WIDTH, 28).fill("#F0EFEC");

  if (hasCyrillic) {
    doc.font("Inter-Regular");
  } else {
    doc.font("Helvetica");
  }

  // The footer sits inside the page's bottom margin area (below PAGE_HEIGHT - MARGIN).
  // pdfkit's text() auto-advances to a new page whenever the given y position falls
  // outside the current bottom margin, even with lineBreak:false. Temporarily zero
  // the bottom margin while drawing the footer to prevent spurious blank pages.
  const origBottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;

  doc
    .fillColor(MUTED)
    .fontSize(8)
    .text(`Food Diary V2 — Аналитика ${from} — ${to}`, MARGIN, footerY + 9, {
      width: CONTENT_WIDTH / 2,
      lineBreak: false,
    });
  doc
    .fillColor(MUTED)
    .fontSize(8)
    .text(`Стр. ${pageNum}`, MARGIN, footerY + 9, {
      width: CONTENT_WIDTH,
      align: "right",
      lineBreak: false,
    });

  doc.page.margins.bottom = origBottomMargin;
}

// ── Page title helper ─────────────────────────────────────────────────────────

function drawPageTitle(doc: InstanceType<typeof PDFDocument>, title: string, BOLD: string): number {
  doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, 26).fill(TEAL);
  doc
    .font(BOLD)
    .fillColor(WHITE)
    .fontSize(12)
    .text(title, MARGIN + 8, MARGIN + 7, { width: CONTENT_WIDTH - 16 });
  return MARGIN + 26 + 14;
}

function drawSectionLabel(doc: InstanceType<typeof PDFDocument>, text: string, y: number, BOLD: string): void {
  doc.font(BOLD).fillColor(DARK).fontSize(11).text(text, MARGIN, y);
}

// ── Chart config builders ────────────────────────────────────────────────────

const commonScaleGrid = { color: C_GRID };

function baseChartOptions(extra: Record<string, any> = {}) {
  return {
    responsive: false,
    animation: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 8 } } },
      y: { grid: commonScaleGrid, ticks: { font: { size: 8 } }, beginAtZero: true },
    },
    ...extra,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateAnalyticsPdf(
  days: Day[],
  mealsByDayId: Map<number, Meal[]>,
  from: string,
  to: string,
): Promise<Buffer> {
  await resolveFonts();

  const hasCyrillic = !!(fontRegular && fontBold);

  // ── Pre-compute summary (shared across pages) ────────────────────────────
  const allMeals: Meal[] = [];
  for (const day of days) {
    allMeals.push(...(mealsByDayId.get(day.id) ?? []));
  }
  const filledDays = days.filter((d) => (mealsByDayId.get(d.id) ?? []).length > 0).length;
  const totalCalories = allMeals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const avgCalories = filledDays > 0 ? totalCalories / filledDays : 0;
  const totalProtein = allMeals.reduce((s, m) => s + (m.protein ?? 0), 0);
  const totalFat = allMeals.reduce((s, m) => s + (m.fat ?? 0), 0);
  const totalCarbs = allMeals.reduce((s, m) => s + (m.carbs ?? 0), 0);
  const totalWater = days.reduce((s, day) => s + totalWaterL(mealsByDayId.get(day.id) ?? []), 0);
  const avgWater = filledDays > 0 ? totalWater / filledDays : 0;

  const sleepHoursByDay = days.map((d) => sleepDurationHours(d));
  const avgSleep = avg(sleepHoursByDay);

  const avgSteps = avg(days.map((d) => d.steps));
  const hungerVals = allMeals.map((m) => m.hungerBefore).filter((v): v is number => v != null);
  const avgHunger = hungerVals.length ? hungerVals.reduce((s, v) => s + v, 0) / hungerVals.length : null;
  const satietyVals = allMeals.map((m) => m.satietyAfter).filter((v): v is number => v != null);
  const avgSatiety = satietyVals.length ? satietyVals.reduce((s, v) => s + v, 0) / satietyVals.length : null;
  const periodDays = days.length;

  const dayLabels = days.map((d) => fmtDateShort(d.date));

  // ── Pre-render ALL charts as PNG buffers before creating the PDF ─────────

  // Page 2: Sleep chart
  const sleepValues = sleepHoursByDay.map((v) => (v != null ? Math.round(v * 10) / 10 : null));
  const sleepChartBuf = await renderChart(
    {
      type: "bar",
      data: {
        labels: dayLabels,
        datasets: [
          {
            type: "bar" as const,
            label: "Сон, ч",
            data: sleepValues,
            backgroundColor: C_SLEEP,
            borderRadius: 2,
          },
          {
            type: "line" as const,
            label: "Цель 8ч",
            data: dayLabels.map(() => 8),
            borderColor: C_WAKE,
            borderWidth: 1.5,
            pointRadius: 0,
            borderDash: [4, 4],
            spanGaps: true,
          },
        ],
      },
      options: baseChartOptions({
        plugins: { legend: { display: false }, title: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 7 }, maxRotation: 90, minRotation: 90 } },
          y: { grid: commonScaleGrid, ticks: { font: { size: 8 } }, beginAtZero: true, suggestedMax: 10 },
        },
      }) as any,
    },
    515,
    200,
  );

  const wakeMinutes = days
    .map((d) => (d.wakeTime ? timeStrToMinutes(d.wakeTime) : null))
    .filter((v): v is number => v != null);
  const sleepMinutes = days
    .map((d) => (d.sleepTime ? timeStrToMinutes(d.sleepTime) : null))
    .filter((v): v is number => v != null);
  const avgWakeMin = wakeMinutes.length ? wakeMinutes.reduce((s, v) => s + v, 0) / wakeMinutes.length : null;
  const avgSleepMin = sleepMinutes.length ? sleepMinutes.reduce((s, v) => s + v, 0) / sleepMinutes.length : null;
  const shortSleepDays = sleepHoursByDay.filter((v) => v != null && v < 6).length;

  // Page 3: Calories chart + moving average
  const dayCalArr = days.map((day) => sumField(mealsByDayId.get(day.id) ?? [], "calories") ?? 0);
  const dayCalNullable = days.map((day) => {
    const v = sumField(mealsByDayId.get(day.id) ?? [], "calories");
    return v != null && v > 0 ? v : null;
  });
  const movingAvgCal = movingAverage7(dayCalNullable);

  const calChartBuf = await renderChart(
    {
      type: "bar",
      data: {
        labels: dayLabels,
        datasets: [
          {
            type: "bar" as const,
            label: "Ккал",
            data: dayCalArr,
            backgroundColor: C_KCAL_BAR,
            borderRadius: 2,
          },
          {
            type: "line" as const,
            label: "Скользящее среднее 7д",
            data: movingAvgCal,
            borderColor: C_MOVING_AVG,
            backgroundColor: C_MOVING_AVG,
            borderWidth: 2,
            pointRadius: 0,
            spanGaps: false,
            tension: 0.2,
          },
        ],
      },
      options: baseChartOptions({
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 7 }, maxRotation: 90, minRotation: 90 } },
          y: { grid: commonScaleGrid, ticks: { font: { size: 8 } }, beginAtZero: true },
        },
      }) as any,
    },
    515,
    200,
  );

  const proteinArr = days.map((day) => sumField(mealsByDayId.get(day.id) ?? [], "protein") ?? 0);
  const fatArr = days.map((day) => sumField(mealsByDayId.get(day.id) ?? [], "fat") ?? 0);
  const carbsArr = days.map((day) => sumField(mealsByDayId.get(day.id) ?? [], "carbs") ?? 0);

  const kbjuStackedBuf = await renderChart(
    {
      type: "bar",
      data: {
        labels: dayLabels,
        datasets: [
          { label: "Белки", data: proteinArr, backgroundColor: C_PROTEIN, stack: "kbju" },
          { label: "Жиры", data: fatArr, backgroundColor: C_FAT, stack: "kbju" },
          { label: "Углеводы", data: carbsArr, backgroundColor: C_CARBS, stack: "kbju" },
        ],
      },
      options: {
        responsive: false,
        animation: false,
        plugins: {
          legend: { display: true, position: "bottom" as const, labels: { boxWidth: 8, font: { size: 8 } } },
          title: { display: false },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { font: { size: 7 }, maxRotation: 90, minRotation: 90 },
          },
          y: { stacked: true, grid: commonScaleGrid, ticks: { font: { size: 8 } }, beginAtZero: true },
        },
      } as any,
    },
    515,
    180,
  );

  const topCalDays = days
    .map((d) => ({ date: d.date, cal: sumField(mealsByDayId.get(d.id) ?? [], "calories") ?? 0 }))
    .filter((d) => d.cal > 0)
    .sort((a, b) => b.cal - a.cal)
    .slice(0, 5);
  const avgCalAllDaysWithData = avg(dayCalNullable);

  // Page 4: Meal timing
  const mealsByDate = new Map<string, Meal[]>();
  for (const day of days) {
    mealsByDate.set(day.date, mealsByDayId.get(day.id) ?? []);
  }

  const eatingWindowArr: (number | null)[] = [];
  const firstMealArr: (number | null)[] = [];
  const lastMealArr: (number | null)[] = [];
  let lateDinnerCount = 0;

  for (const day of days) {
    const dayMeals = mealsByDate.get(day.date) ?? [];
    if (!dayMeals.length) {
      eatingWindowArr.push(null);
      firstMealArr.push(null);
      lastMealArr.push(null);
      continue;
    }
    const sorted = [...dayMeals].sort(
      (a, b) =>
        timeStrToMinutes(a.tsStart.slice(11, 16) || a.tsStart) - timeStrToMinutes(b.tsStart.slice(11, 16) || b.tsStart),
    );
    const extractTime = (ts: string): string => (ts.length > 5 ? ts.slice(11, 16) : ts);
    const firstT = extractTime(sorted[0].tsStart);
    const lastT = extractTime(sorted[sorted.length - 1].tsStart);
    const firstMin = timeStrToMinutes(firstT);
    const lastMin = timeStrToMinutes(lastT);
    const windowH = Math.max(0, (lastMin - firstMin) / 60);
    eatingWindowArr.push(Math.round(windowH * 10) / 10);
    firstMealArr.push(firstMin / 60);
    lastMealArr.push(lastMin / 60);
    if (lastMin >= 21 * 60) lateDinnerCount += 1;
  }

  const eatingWindowColors = eatingWindowArr.map((v) => (v != null && v > 5 ? C_GAP_LONG : C_GAP_NORMAL));

  const eatingWindowChartBuf = await renderChart(
    {
      type: "bar",
      data: {
        labels: dayLabels,
        datasets: [
          {
            label: "Окно питания, ч",
            data: eatingWindowArr,
            backgroundColor: eatingWindowColors,
            borderRadius: 2,
          },
        ],
      },
      options: baseChartOptions({
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 7 }, maxRotation: 90, minRotation: 90 } },
          y: { grid: commonScaleGrid, ticks: { font: { size: 8 } }, beginAtZero: true },
        },
      }) as any,
    },
    515,
    200,
  );

  const firstLastChartBuf = await renderChart(
    {
      type: "bar",
      data: {
        labels: dayLabels,
        datasets: [
          { label: "Первый приём", data: firstMealArr, backgroundColor: C_WAKE },
          { label: "Последний приём", data: lastMealArr, backgroundColor: C_SLEEP },
        ],
      },
      options: {
        responsive: false,
        animation: false,
        plugins: {
          legend: { display: true, position: "bottom" as const, labels: { boxWidth: 8, font: { size: 8 } } },
          title: { display: false },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 7 }, maxRotation: 90, minRotation: 90 } },
          y: { grid: commonScaleGrid, ticks: { font: { size: 8 } }, beginAtZero: true, suggestedMax: 24 },
        },
      } as any,
    },
    515,
    180,
  );

  const avgEatingWindow = avg(eatingWindowArr);

  // Page 5: Hunger / satiety
  const hungerByDay: (number | null)[] = [];
  const satietyByDay: (number | null)[] = [];
  for (const day of days) {
    const dayMeals = mealsByDate.get(day.date) ?? [];
    const hVals = dayMeals.map((m) => m.hungerBefore).filter((v): v is number => v != null);
    const sVals = dayMeals.map((m) => m.satietyAfter).filter((v): v is number => v != null);
    hungerByDay.push(hVals.length ? hVals.reduce((s, v) => s + v, 0) / hVals.length : null);
    satietyByDay.push(sVals.length ? sVals.reduce((s, v) => s + v, 0) / sVals.length : null);
  }

  const hungerSatietyLineBuf = await renderChart(
    {
      type: "line",
      data: {
        labels: dayLabels,
        datasets: [
          {
            label: "Голод до",
            data: hungerByDay,
            borderColor: C_HUNGER,
            backgroundColor: C_HUNGER,
            borderWidth: 2,
            pointRadius: 2,
            spanGaps: false,
            tension: 0.15,
          },
          {
            label: "Насыщение после",
            data: satietyByDay,
            borderColor: C_SATIETY,
            backgroundColor: C_SATIETY,
            borderWidth: 2,
            pointRadius: 2,
            spanGaps: false,
            tension: 0.15,
          },
        ],
      },
      options: {
        responsive: false,
        animation: false,
        plugins: {
          legend: { display: true, position: "bottom" as const, labels: { boxWidth: 8, font: { size: 8 } } },
          title: { display: false },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 7 }, maxRotation: 90, minRotation: 90 } },
          y: { grid: commonScaleGrid, ticks: { font: { size: 8 } }, min: 0, max: 10 },
        },
      } as any,
    },
    515,
    200,
  );

  const hungerHist = buildHistogram11(hungerVals);
  const satietyHist = buildHistogram11(satietyVals);
  const histLabels = Array.from({ length: 11 }, (_, i) => String(i));

  const hungerHistBuf = await renderChart(
    {
      type: "bar",
      data: {
        labels: histLabels,
        datasets: [{ label: "Голод", data: hungerHist, backgroundColor: C_HUNGER, borderRadius: 2 }],
      },
      options: baseChartOptions() as any,
    },
    250,
    160,
  );

  const satietyHistBuf = await renderChart(
    {
      type: "bar",
      data: {
        labels: histLabels,
        datasets: [{ label: "Насыщение", data: satietyHist, backgroundColor: C_SATIETY, borderRadius: 2 }],
      },
      options: baseChartOptions() as any,
    },
    250,
    160,
  );

  let overeatingCount = 0;
  let greenZoneCount = 0;
  let ratedMealsCount = 0;
  for (const m of allMeals) {
    if (m.satietyAfter != null && m.satietyAfter >= 8) overeatingCount += 1;
    if (m.hungerBefore != null && m.satietyAfter != null) {
      ratedMealsCount += 1;
      if (m.hungerBefore >= 3 && m.hungerBefore <= 6 && m.satietyAfter >= 5 && m.satietyAfter <= 7) {
        greenZoneCount += 1;
      }
    }
  }
  const greenZonePct = ratedMealsCount > 0 ? Math.round((greenZoneCount / ratedMealsCount) * 100) : 0;

  // Page 6: Activity
  const stepsArr = days.map((d) => d.steps ?? null);
  const stepsChartBuf = await renderChart(
    {
      type: "bar",
      data: {
        labels: dayLabels,
        datasets: [
          {
            type: "bar" as const,
            label: "Шаги",
            data: stepsArr,
            backgroundColor: C_STEPS,
            borderRadius: 2,
          },
          {
            type: "line" as const,
            label: "Цель 10000",
            data: dayLabels.map(() => 10000),
            borderColor: "#ef4444",
            borderWidth: 1.5,
            pointRadius: 0,
            borderDash: [4, 4],
            spanGaps: true,
          },
        ],
      },
      options: baseChartOptions({
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 7 }, maxRotation: 90, minRotation: 90 } },
          y: { grid: commonScaleGrid, ticks: { font: { size: 8 } }, beginAtZero: true },
        },
      }) as any,
    },
    515,
    200,
  );

  const stepsWithData = stepsArr.filter((v): v is number => v != null && v > 0);
  const avgStepsPerDay = stepsWithData.length ? stepsWithData.reduce((s, v) => s + v, 0) / stepsWithData.length : null;
  const activityDaysCount = days.filter(
    (d) => d.sportActivity && d.sportActivity.trim() && d.sportActivity.trim().toLowerCase() !== "нет",
  ).length;
  const activitiesList = Array.from(
    new Set(days.map((d) => d.sportActivity?.trim()).filter((v): v is string => !!v && v.toLowerCase() !== "нет")),
  );
  let activitiesStr = activitiesList.join(", ");
  if (activitiesStr.length > 200) activitiesStr = activitiesStr.slice(0, 197) + "...";

  // Page 7: Additional metrics
  const MEAL_TYPES = ["завтрак", "обед", "перекус", "ужин"];
  const mealTypeSkipDays = new Map<string, number>();
  for (const type of MEAL_TYPES) mealTypeSkipDays.set(type, 0);
  for (const day of days) {
    const dayMeals = mealsByDate.get(day.date) ?? [];
    for (const type of MEAL_TYPES) {
      if (!dayMeals.some((m) => m.mealType === type)) {
        mealTypeSkipDays.set(type, (mealTypeSkipDays.get(type) ?? 0) + 1);
      }
    }
  }
  const mostSkipped = Array.from(mealTypeSkipDays.entries()).sort((a, b) => b[1] - a[1])[0];

  const contextCounts = new Map<string, number>();
  for (const m of allMeals) {
    const ctx = m.contextNote?.trim();
    if (ctx) contextCounts.set(ctx, (contextCounts.get(ctx) ?? 0) + 1);
  }
  const topContexts = Array.from(contextCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const waterByDay = days.map((d) => {
    const l = totalWaterL(mealsByDayId.get(d.id) ?? []);
    return l > 0 ? Math.round(l * 10) / 10 : null;
  });

  const waterSparklineBuf = await renderChart(
    {
      type: "line",
      data: {
        labels: dayLabels,
        datasets: [
          {
            label: "Вода, л",
            data: waterByDay,
            borderColor: TEAL,
            backgroundColor: TEAL,
            borderWidth: 2,
            pointRadius: 1,
            spanGaps: false,
            tension: 0.2,
            fill: false,
          },
        ],
      },
      options: baseChartOptions({
        plugins: { legend: { display: false }, title: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { display: false } },
          y: { grid: commonScaleGrid, ticks: { font: { size: 8 } }, beginAtZero: true },
        },
      }) as any,
    },
    515,
    120,
  );

  // ── Build the PDF document (all charts already rendered above) ───────────

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    const doc = new PDFDocument({
      size: "A4",
      margin: MARGIN,
      bufferPages: true,
      info: {
        Title: `Аналитика питания ${from} — ${to}`,
        Author: "Food Diary V2",
        Subject: "Аналитика питания",
      },
    });

    // Register fonts
    if (hasCyrillic) {
      doc.registerFont("Inter-Regular", fontRegular!);
      doc.registerFont("Inter-Bold", fontBold!);
    }

    const REG = hasCyrillic ? "Inter-Regular" : "Helvetica";
    const BOLD = hasCyrillic ? "Inter-Bold" : "Helvetica-Bold";

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ╔══════════════════════════════╗
    // ║   PAGE 1 — COVER + KPIs      ║
    // ╚══════════════════════════════╝

    doc.rect(0, 0, PAGE_WIDTH, 120).fill(TEAL);

    doc.font(BOLD).fillColor(WHITE).fontSize(22).text("Аналитика питания", MARGIN, 30, { width: CONTENT_WIDTH });

    doc
      .font(REG)
      .fillColor("rgba(255,255,255,0.85)")
      .fontSize(12)
      .text(`${ruDate(from)} — ${ruDate(to)}`, MARGIN, 66, { width: CONTENT_WIDTH });

    const now = new Date();
    doc
      .font(REG)
      .fillColor("rgba(255,255,255,0.6)")
      .fontSize(8)
      .text(`Сформировано ${now.toLocaleDateString("ru-RU")}`, MARGIN, 98, {
        width: CONTENT_WIDTH,
        align: "right",
      });

    // ── KPI Cards ────────────────────────────────────────────────────────────
    const kpiY = 138;
    const cardW = (CONTENT_WIDTH - 15) / 4;
    const cardH = 72;

    const kpis = [
      {
        label: "Заполнено дней",
        value: `${filledDays} / ${periodDays}`,
        sub: `${Math.round((filledDays / Math.max(periodDays, 1)) * 100)}%`,
      },
      {
        label: "Средние ккал/день",
        value: fmtNum(avgCalories),
        sub: `всего ${fmtNum(totalCalories)} ккал`,
      },
      {
        label: "Вода ср./день",
        value: `${fmtNum(avgWater, 1)} л`,
        sub: `всего ${totalWater.toFixed(1)} л`,
      },
      {
        label: "Сон ср. / шаги",
        value: `${fmtNum(avgSleep, 1)} ч`,
        sub: avgSteps ? `${fmtNum(avgSteps)} ш/д` : "шаги: —",
      },
    ];

    kpis.forEach((kpi, i) => {
      const x = MARGIN + i * (cardW + 5);
      doc.roundedRect(x, kpiY, cardW, cardH, 5).fillAndStroke(BG_LIGHT, BORDER);
      doc
        .font(REG)
        .fillColor(MUTED)
        .fontSize(8)
        .text(kpi.label, x + 8, kpiY + 9, { width: cardW - 16 });
      doc
        .font(BOLD)
        .fillColor(DARK)
        .fontSize(17)
        .text(kpi.value, x + 8, kpiY + 22, { width: cardW - 16 });
      doc
        .font(REG)
        .fillColor(MUTED)
        .fontSize(8)
        .text(kpi.sub, x + 8, kpiY + 50, { width: cardW - 16 });
    });

    // ── Macros ───────────────────────────────────────────────────────────────
    const macroY = kpiY + cardH + 18;
    doc.rect(MARGIN, macroY, CONTENT_WIDTH, 0.5).fill(BORDER);
    doc
      .font(BOLD)
      .fillColor(DARK)
      .fontSize(12)
      .text("Нутриенты за период", MARGIN, macroY + 10);

    const macros = [
      { label: "Белки", value: `${fmtNum(totalProtein, 1)} г`, color: C_PROTEIN },
      { label: "Жиры", value: `${fmtNum(totalFat, 1)} г`, color: C_FAT },
      { label: "Углеводы", value: `${fmtNum(totalCarbs, 1)} г`, color: C_CARBS },
      { label: "Ккал всего", value: fmtNum(totalCalories), color: TEAL },
    ];
    const macroColW = CONTENT_WIDTH / 4;
    const macroRowY = macroY + 30;
    macros.forEach((mac, i) => {
      const x = MARGIN + i * macroColW;
      doc.font(BOLD).fillColor(mac.color).fontSize(9).text(mac.label, x, macroRowY, { width: macroColW });
      doc
        .font(BOLD)
        .fillColor(DARK)
        .fontSize(15)
        .text(mac.value, x, macroRowY + 12, { width: macroColW });
    });

    // ── Hunger / Satiety ─────────────────────────────────────────────────────
    const hsY = macroRowY + 38;
    doc.rect(MARGIN, hsY, CONTENT_WIDTH, 0.5).fill(BORDER);
    doc
      .font(BOLD)
      .fillColor(DARK)
      .fontSize(12)
      .text("Голод и насыщение", MARGIN, hsY + 10);

    const hsItems = [
      { label: "Голод до (ср.)", value: fmtNum(avgHunger, 1) },
      { label: "Насыщение после (ср.)", value: fmtNum(avgSatiety, 1) },
      { label: "Приёмов пищи", value: String(allMeals.length) },
      { label: "Дней с активностью", value: String(days.filter((d) => d.sportActivity).length) },
    ];
    const hsColW = CONTENT_WIDTH / 4;
    const hsItemY = hsY + 30;
    hsItems.forEach((item, i) => {
      const x = MARGIN + i * hsColW;
      doc
        .font(REG)
        .fillColor(MUTED)
        .fontSize(8)
        .text(item.label, x, hsItemY, { width: hsColW - 5 });
      doc
        .font(BOLD)
        .fillColor(DARK)
        .fontSize(16)
        .text(item.value, x, hsItemY + 12, { width: hsColW - 5 });
    });

    drawFooter(doc, 1, from, to, hasCyrillic);

    // ╔══════════════════════════════╗
    // ║   PAGE 2 — SLEEP BLOCK       ║
    // ╚══════════════════════════════╝
    doc.addPage();
    let y = drawPageTitle(doc, "Блок 1: Сон", BOLD);

    doc.image(sleepChartBuf, MARGIN, y, { width: 515 });
    y += 200 + 16;

    drawSectionLabel(doc, "Статистика сна", y, BOLD);
    y += 18;
    const sleepStats = [
      [`Среднее время подъёма:`, minutesToHHMM(avgWakeMin)],
      [`Среднее время отбоя:`, minutesToHHMM(avgSleepMin)],
      [`Средняя продолжительность:`, `${fmtNum(avgSleep, 1)} ч`],
      [`Дней < 6ч сна:`, String(shortSleepDays)],
    ];
    sleepStats.forEach(([label, value]) => {
      doc.font(REG).fillColor(MUTED).fontSize(9).text(label, MARGIN, y, { width: 260, continued: false });
      doc
        .font(BOLD)
        .fillColor(DARK)
        .fontSize(9)
        .text(value, MARGIN + 260, y, { width: CONTENT_WIDTH - 260 });
      y += 16;
    });

    drawFooter(doc, 2, from, to, hasCyrillic);

    // ╔══════════════════════════════════╗
    // ║ PAGE 3 — CALORIES + КБЖУ BLOCK   ║
    // ╚══════════════════════════════════╝
    doc.addPage();
    y = drawPageTitle(doc, "Блок 2: Калорийность и КБЖУ", BOLD);

    doc.image(calChartBuf, MARGIN, y, { width: 515 });
    y += 200 + 10;

    doc.image(kbjuStackedBuf, MARGIN, y, { width: 515 });
    y += 180 + 14;

    drawSectionLabel(doc, "Топ-5 дней по ккал", y, BOLD);
    y += 16;
    if (topCalDays.length) {
      topCalDays.forEach((d) => {
        doc
          .font(REG)
          .fillColor(DARK)
          .fontSize(9)
          .text(`${fmtDateShort(d.date)}: ${fmtNum(d.cal)} ккал`, MARGIN, y, { width: CONTENT_WIDTH });
        y += 13;
      });
    } else {
      doc.font(REG).fillColor(MUTED).fontSize(9).text("Нет данных", MARGIN, y);
      y += 13;
    }
    y += 4;
    doc.font(REG).fillColor(MUTED).fontSize(9).text("Ср. ккал (все дни с данными): ", MARGIN, y, { continued: true });
    doc.font(BOLD).fillColor(DARK).fontSize(9).text(fmtNum(avgCalAllDaysWithData));

    drawFooter(doc, 3, from, to, hasCyrillic);

    // ╔══════════════════════════════════════╗
    // ║ PAGE 4 — MEAL TIMING BLOCK           ║
    // ╚══════════════════════════════════════╝
    doc.addPage();
    y = drawPageTitle(doc, "Блок 3: Перерывы между приёмами", BOLD);

    doc.image(eatingWindowChartBuf, MARGIN, y, { width: 515 });
    y += 200 + 10;

    doc.image(firstLastChartBuf, MARGIN, y, { width: 515 });
    y += 180 + 14;

    drawSectionLabel(doc, "Статистика", y, BOLD);
    y += 18;
    const timingStats = [
      [`Среднее окно питания:`, `${fmtNum(avgEatingWindow, 1)} ч`],
      [`Дней с ужином после 21:00:`, String(lateDinnerCount)],
    ];
    timingStats.forEach(([label, value]) => {
      doc.font(REG).fillColor(MUTED).fontSize(9).text(label, MARGIN, y, { width: 260 });
      doc
        .font(BOLD)
        .fillColor(DARK)
        .fontSize(9)
        .text(value, MARGIN + 260, y, { width: CONTENT_WIDTH - 260 });
      y += 16;
    });

    drawFooter(doc, 4, from, to, hasCyrillic);

    // ╔══════════════════════════════════════╗
    // ║ PAGE 5 — HUNGER / SATIETY BLOCK      ║
    // ╚══════════════════════════════════════╝
    doc.addPage();
    y = drawPageTitle(doc, "Блок 4: Голод и насыщение", BOLD);

    doc.image(hungerSatietyLineBuf, MARGIN, y, { width: 515 });
    y += 200 + 10;

    doc.image(hungerHistBuf, MARGIN, y, { width: 250 });
    doc.image(satietyHistBuf, MARGIN + 265, y, { width: 250 });
    y += 160 + 14;

    drawSectionLabel(doc, "Статистика", y, BOLD);
    y += 18;
    const hsStats = [
      [`Среднее голода (до):`, fmtNum(avgHunger, 1)],
      [`Среднее насыщения (после):`, fmtNum(avgSatiety, 1)],
      [`Переедания (насыщение ≥ 8):`, `${overeatingCount} раз`],
      [`«Зелёная зона» (голод 3-6, насыщение 5-7):`, `${greenZonePct}%`],
    ];
    hsStats.forEach(([label, value]) => {
      doc.font(REG).fillColor(MUTED).fontSize(9).text(label, MARGIN, y, { width: 300 });
      doc
        .font(BOLD)
        .fillColor(DARK)
        .fontSize(9)
        .text(value, MARGIN + 300, y, { width: CONTENT_WIDTH - 300 });
      y += 16;
    });

    drawFooter(doc, 5, from, to, hasCyrillic);

    // ╔══════════════════════════════════════╗
    // ║ PAGE 6 — ACTIVITY BLOCK              ║
    // ╚══════════════════════════════════════╝
    doc.addPage();
    y = drawPageTitle(doc, "Блок 5: Активность и шаги", BOLD);

    doc.image(stepsChartBuf, MARGIN, y, { width: 515 });
    y += 200 + 16;

    drawSectionLabel(doc, "Статистика", y, BOLD);
    y += 18;
    doc.font(REG).fillColor(MUTED).fontSize(9).text("Среднее шагов/день:", MARGIN, y, { width: 260 });
    doc
      .font(BOLD)
      .fillColor(DARK)
      .fontSize(9)
      .text(avgStepsPerDay != null ? fmtNum(avgStepsPerDay) : "—", MARGIN + 260, y, {
        width: CONTENT_WIDTH - 260,
      });
    y += 16;
    doc.font(REG).fillColor(MUTED).fontSize(9).text("Дней с активностью:", MARGIN, y, { width: 260 });
    doc
      .font(BOLD)
      .fillColor(DARK)
      .fontSize(9)
      .text(`${activityDaysCount} (из ${periodDays})`, MARGIN + 260, y, { width: CONTENT_WIDTH - 260 });
    y += 20;
    doc.font(REG).fillColor(MUTED).fontSize(9).text("Список активностей:", MARGIN, y, { width: CONTENT_WIDTH });
    y += 14;
    doc
      .font(REG)
      .fillColor(DARK)
      .fontSize(9)
      .text(activitiesStr || "—", MARGIN, y, { width: CONTENT_WIDTH });

    drawFooter(doc, 6, from, to, hasCyrillic);

    // ╔══════════════════════════════════════╗
    // ║ PAGE 7 — ADDITIONAL METRICS          ║
    // ╚══════════════════════════════════════╝
    doc.addPage();
    y = drawPageTitle(doc, "Блок 6: Дополнительные метрики", BOLD);

    drawSectionLabel(doc, "Самый пропускаемый приём пищи", y, BOLD);
    y += 16;
    if (mostSkipped) {
      doc
        .font(REG)
        .fillColor(DARK)
        .fontSize(9)
        .text(`${mostSkipped[0]}: пропущен в ${mostSkipped[1]} из ${periodDays} дней`, MARGIN, y, {
          width: CONTENT_WIDTH,
        });
      y += 14;
    } else {
      doc.font(REG).fillColor(MUTED).fontSize(9).text("Нет данных", MARGIN, y);
      y += 14;
    }
    y += 10;

    drawSectionLabel(doc, "Топ контекстов приёмов пищи", y, BOLD);
    y += 16;
    if (topContexts.length) {
      topContexts.forEach(([ctx, count]) => {
        doc.font(REG).fillColor(DARK).fontSize(9).text(`${ctx}: ${count}`, MARGIN, y, { width: CONTENT_WIDTH });
        y += 13;
      });
    } else {
      doc.font(REG).fillColor(MUTED).fontSize(9).text("Нет данных", MARGIN, y);
      y += 13;
    }
    y += 10;

    drawSectionLabel(doc, "Вода по дням", y, BOLD);
    y += 12;
    doc.image(waterSparklineBuf, MARGIN, y, { width: 515 });
    y += 120;

    drawFooter(doc, 7, from, to, hasCyrillic);

    // ╔══════════════════════════════╗
    // ║       PER-DAY TABLE          ║
    // ╚══════════════════════════════╝

    const TABLE_PAGE_ROWS = 25;
    const totalPages = Math.ceil(days.length / TABLE_PAGE_ROWS);
    const TABLE_START_PAGE_NUM = 8;

    for (let page = 0; page < totalPages; page++) {
      doc.addPage();
      const pageDays = days.slice(page * TABLE_PAGE_ROWS, (page + 1) * TABLE_PAGE_ROWS);

      // Page title bar
      doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, 26).fill(TEAL);
      doc
        .font(BOLD)
        .fillColor(WHITE)
        .fontSize(10)
        .text("Дневник по дням", MARGIN + 8, MARGIN + 8, { width: CONTENT_WIDTH - 16 });

      // Table header
      const TABLE_Y = MARGIN + 38;
      const cols = [
        { label: "Дата", width: 42 },
        { label: "Приёмов", width: 44 },
        { label: "Ккал", width: 46 },
        { label: "Белки г", width: 44 },
        { label: "Жиры г", width: 44 },
        { label: "Углев. г", width: 44 },
        { label: "Вода л", width: 38 },
        { label: "Сон ч", width: 36 },
        { label: "Шаги", width: 44 },
        { label: "Активность", width: 133 },
      ];
      const totalColW = cols.reduce((s, c) => s + c.width, 0);
      const scaleF = CONTENT_WIDTH / totalColW;

      // Header row
      doc.rect(MARGIN, TABLE_Y, CONTENT_WIDTH, 17).fill("#E8E6E1");
      let cx = MARGIN;
      cols.forEach((col) => {
        const cw = col.width * scaleF;
        doc
          .font(BOLD)
          .fillColor(DARK)
          .fontSize(7.5)
          .text(col.label, cx + 3, TABLE_Y + 5, { width: cw - 6, lineBreak: false });
        cx += cw;
      });

      // Data rows
      let rowY = TABLE_Y + 19;
      pageDays.forEach((day, ri) => {
        const meals = mealsByDayId.get(day.id) ?? [];
        const cal = sumField(meals, "calories");
        const prot = sumField(meals, "protein");
        const fat = sumField(meals, "fat");
        const carb = sumField(meals, "carbs");
        const water = totalWaterL(meals);
        const sleepH = sleepDurationHours(day);

        if (ri % 2 === 0) {
          doc.rect(MARGIN, rowY, CONTENT_WIDTH, 16).fill("#FAFAF8");
        }

        const rowData = [
          fmtDateShort(day.date),
          String(meals.length),
          fmtNum(cal),
          fmtNum(prot, 1),
          fmtNum(fat, 1),
          fmtNum(carb, 1),
          water > 0 ? water.toFixed(1) : "—",
          sleepH != null ? sleepH.toFixed(1) : "—",
          day.steps ? String(day.steps) : "—",
          day.sportActivity ? day.sportActivity.slice(0, 24) : "—",
        ];

        cx = MARGIN;
        rowData.forEach((val, ci) => {
          const cw = cols[ci].width * scaleF;
          doc
            .font(REG)
            .fillColor(DARK)
            .fontSize(8)
            .text(val, cx + 3, rowY + 4, { width: cw - 6, lineBreak: false });
          cx += cw;
        });

        doc.rect(MARGIN, rowY + 15, CONTENT_WIDTH, 0.5).fill(BORDER);
        rowY += 16;
      });

      drawFooter(doc, TABLE_START_PAGE_NUM + page, from, to, hasCyrillic);
    }

    doc.end();
  });
}
