/**
 * NEW-PDF-1 (v2.29.0): Doctor-facing PDF report
 *
 * Compact PDF report optimised for a doctor reading the diary once:
 *   - Day mode: 1 page A4 portrait, one row per meal
 *   - Range mode (week/month/custom): multi-page A4, one row per day + period summary
 *
 * Uses pdfkit with the same embedded Inter TTF (Regular + Bold) that
 * `analytics-pdf.ts` already ships in the Docker image (server/fonts/*).
 * No Chart.js dependency — this report is table-first for readability.
 */
import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Day, Meal } from "@shared/schema";

// ESM-safe __dirname: works both under tsx/vitest and inside the compiled CJS
// bundle where AGENTS.md's shim provides __dirname.
const MODULE_DIR: string = (() => {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return process.cwd();
  }
})();

// ── Font resolution (shared strategy with analytics-pdf) ─────────────────────

const DATA_DIR = process.env.SQLITE_DB_PATH
  ? path.dirname(process.env.SQLITE_DB_PATH)
  : path.join(process.cwd(), "data");

const FONT_CACHE_DIR = path.join(DATA_DIR, "fonts");

const LOCAL_FONT_DIRS = [
  path.join(process.cwd(), "server", "fonts"),
  path.join(MODULE_DIR, "fonts"),
  path.join(process.cwd(), "dist", "fonts"),
  FONT_CACHE_DIR,
];

function findFontFile(name: string): string | null {
  for (const dir of LOCAL_FONT_DIRS) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

let fontRegular: string | null = null;
let fontBold: string | null = null;
let fontsReady = false;

function resolveFonts(): void {
  if (fontsReady) return;
  fontRegular = findFontFile("Inter-Regular.ttf");
  fontBold = findFontFile("Inter-Bold.ttf");
  fontsReady = true;
}

function useFont(doc: InstanceType<typeof PDFDocument>, bold = false): string {
  resolveFonts();
  const target = bold ? fontBold : fontRegular;
  if (target) {
    try {
      doc.font(target);
      return bold ? "Inter-Bold" : "Inter-Regular";
    } catch {
      /* fallthrough */
    }
  }
  const helvetica = bold ? "Helvetica-Bold" : "Helvetica";
  doc.font(helvetica);
  return helvetica;
}

// ── Layout constants ─────────────────────────────────────────────────────────

const PAGE_WIDTH = 595; // A4 portrait pt
const PAGE_HEIGHT = 842;
const MARGIN = 32;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const TEAL = "#01696F";
const TEAL_LIGHT = "#E6F1F1"; // subtle teal tint for callout backgrounds
const DARK = "#28251D";
const MUTED = "#7A7974";
const BORDER = "#D4D1CA";
const BG_ROW = "#F7F6F2";
const WHITE = "#FFFFFF";
const BAR_BG = "#EEECE6";
const BAR_OK = "#4A9E5A"; // green — within ±10% of target
const BAR_WARN = "#E0A64B"; // amber — 10-30% deviation
const BAR_OVER = "#C25B4A"; // red — >30% over target

const APP_VERSION = getAppVersion();

function getAppVersion(): string {
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      return pkg.version ?? "2.29.4";
    }
  } catch {
    /* ignore */
  }
  return "2.29.0";
}

// ── Data helpers ─────────────────────────────────────────────────────────────

const DAYS_RU_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
/** Matches `hungerLabel` in client/src/lib/diary-utils.ts — not "0 = отсутствует". */
export const HUNGER_SATIETY_LEGEND =
  "Голод/сытость: 0 = экстремальный голод, 10 = экстремальное переедание. Подпись врача: ______________________";
const MEAL_TYPE_RU: Record<string, string> = {
  breakfast: "Завтрак",
  lunch: "Обед",
  dinner: "Ужин",
  snack: "Перекус",
  drink: "Напиток",
  other: "Другое",
};

function dayOfWeekShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return DAYS_RU_SHORT[new Date(y, m - 1, d).getDay()];
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

function fmtDateShort(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}.${m}`;
}

function fmtTimeHM(ts: string | null | undefined): string {
  if (!ts) return "—";
  // tsStart is ISO string in DB; also accept "HH:MM" for defensiveness
  if (/^\d{2}:\d{2}/.test(ts)) return ts.slice(0, 5);
  const t = new Date(ts);
  if (isNaN(t.getTime())) return "—";
  return `${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}`;
}

function mealWaterMl(m: Meal): number {
  if (m.waterMl != null && !isNaN(m.waterMl)) return m.waterMl;
  return (m.waterUnits ?? 0) * 500;
}

function totalWaterMl(meals: Meal[]): number {
  return meals.reduce((s, m) => s + mealWaterMl(m), 0);
}

function sumField(meals: Meal[], field: "calories" | "protein" | "fat" | "carbs"): number {
  return meals.reduce((s, m) => {
    const v = m[field];
    return s + (v != null && !isNaN(v) ? v : 0);
  }, 0);
}

function avgOrNull(values: (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => v != null && !isNaN(v));
  if (!nums.length) return null;
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

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

function fmt0(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return "—";
  return String(Math.round(v));
}

function fmt1(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return "—";
  return (Math.round(v * 10) / 10).toFixed(1);
}

// ── Low-level drawing helpers ────────────────────────────────────────────────

type PDFDoc = InstanceType<typeof PDFDocument>;

function drawHLine(doc: PDFDoc, y: number, color = BORDER, width = 0.5): void {
  doc.save();
  doc
    .strokeColor(color)
    .lineWidth(width)
    .moveTo(MARGIN, y)
    .lineTo(PAGE_WIDTH - MARGIN, y)
    .stroke();
  doc.restore();
}

function drawHeader(doc: PDFDoc, title: string, subtitle: string, patientLabel: string | null): number {
  // Top brand strip
  doc.save();
  doc.rect(0, 0, PAGE_WIDTH, 6).fill(TEAL);
  doc.restore();

  // Right-side generation stamp — fixed column, aligned to the far right.
  const rightBlockW = 190;
  const rightBlockX = MARGIN + CONTENT_WIDTH - rightBlockW;
  const titleW = CONTENT_WIDTH - rightBlockW - 8;

  // Auto-shrink title font so it always fits into `titleW` on a single line.
  useFont(doc, true);
  let titleSize = 16;
  while (titleSize >= 10 && doc.fontSize(titleSize).widthOfString(title) > titleW) {
    titleSize -= 0.5;
  }
  doc
    .fillColor(DARK)
    .fontSize(titleSize)
    .text(title, MARGIN, 20 - titleSize / 2 + 8, {
      width: titleW,
      height: titleSize + 4,
      lineBreak: false,
      ellipsis: true,
    });

  useFont(doc);
  const rightBlock = `Сгенерировано: ${new Date().toISOString().slice(0, 10)} · v${APP_VERSION}`;
  doc.fillColor(MUTED).fontSize(8.5).text(rightBlock, rightBlockX, 22, {
    width: rightBlockW,
    height: 12,
    align: "right",
    lineBreak: false,
  });

  doc.fillColor(DARK).fontSize(10).text(subtitle, MARGIN, 40, {
    width: CONTENT_WIDTH,
    height: 14,
    lineBreak: false,
    ellipsis: true,
  });

  if (patientLabel) {
    useFont(doc);
    doc.fillColor(MUTED).fontSize(9).text(`Пациент: ${patientLabel}`, MARGIN, 55, { width: CONTENT_WIDTH });
  }
  const y = patientLabel ? 72 : 60;
  drawHLine(doc, y, BORDER, 0.8);
  return y + 6;
}

/**
 * Post-processing footer painter.
 *
 * Iterates every buffered page and paints a footer that always fits on the
 * *current* page, regardless of where the content cursor ended up. Using this
 * from `bufferedPages()` avoids the classic pdfkit gotcha where a naive
 * `doc.text(...)` at a fixed y triggers a spurious page break when the content
 * cursor has already crossed the bottom margin.
 *
 * Parameters:
 *  - legendOnLastOnly: draw the legend/signature line only on the last page.
 */
function paintFootersOnAllPages(doc: PDFDoc, legendOnLastOnly: boolean): void {
  const range = doc.bufferedPageRange();
  const total = range.count;

  // Suppress pdfkit's automatic page break for the duration of the footer
  // pass. Without this, drawing text near the bottom margin can trigger a
  // spurious `addPage()` and inflate the page count on the fly.

  const anyDoc = doc as unknown as { options: { autoFirstPage: boolean }; page: { margins: { bottom: number } } };
  const origBottom = anyDoc.page.margins.bottom;
  for (let i = 0; i < total; i++) {
    doc.switchToPage(range.start + i);
    // Force the bottom margin to zero on this page so pdfkit does not create a
    // new page when we draw in the footer area.

    (doc as any).page.margins.bottom = 0;

    const isLast = i === total - 1;
    const yLine = PAGE_HEIGHT - 26;

    // Divider
    doc.save();
    doc
      .strokeColor(BORDER)
      .lineWidth(0.4)
      .moveTo(MARGIN, yLine - 4)
      .lineTo(MARGIN + CONTENT_WIDTH, yLine - 4)
      .stroke();
    doc.restore();

    useFont(doc);
    doc.fillColor(MUTED).fontSize(8);
    if (!legendOnLastOnly || isLast) {
      doc.text(HUNGER_SATIETY_LEGEND, MARGIN, yLine, {
        width: CONTENT_WIDTH,
        lineBreak: false,
        ellipsis: true,
      });
    }
    doc.fillColor(MUTED).fontSize(8);
    doc.text(`Стр. ${i + 1} из ${total}`, MARGIN, PAGE_HEIGHT - 14, {
      width: CONTENT_WIDTH,
      align: "right",
      lineBreak: false,
    });

    // Restore the bottom margin for this page just in case any later API user peeks.

    (doc as any).page.margins.bottom = origBottom;
  }
}

/** Draw a KPI card block. Returns new y. */
function drawSummaryBlock(
  doc: PDFDoc,
  y: number,
  items: Array<{ label: string; value: string; unit?: string }>,
): number {
  const cols = Math.min(items.length, 6) || 1;
  const gap = 6;
  const cellW = (CONTENT_WIDTH - gap * (cols - 1)) / cols;
  const cellH = 46;
  const innerW = cellW - 12;

  const rows = Math.ceil(items.length / cols);
  for (let i = 0; i < items.length; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = MARGIN + col * (cellW + gap);
    const cy = y + row * (cellH + gap);

    doc.save();
    doc.roundedRect(x, cy, cellW, cellH, 4).fillAndStroke(BG_ROW, BORDER);
    doc.restore();

    const it = items[i];
    // Label
    useFont(doc);
    doc
      .fillColor(MUTED)
      .fontSize(7.5)
      .text(it.label, x + 6, cy + 5, {
        width: innerW,
        lineBreak: false,
        ellipsis: true,
      });

    // Value — auto-shrink font so it never wraps.
    useFont(doc, true);
    let vSize = 14;
    while (vSize >= 9 && doc.fontSize(vSize).widthOfString(it.value) > innerW) {
      vSize -= 0.5;
    }
    doc
      .fillColor(DARK)
      .fontSize(vSize)
      .text(it.value, x + 6, cy + 18, {
        width: innerW,
        lineBreak: false,
        ellipsis: true,
      });

    // Unit
    if (it.unit) {
      useFont(doc);
      doc
        .fillColor(MUTED)
        .fontSize(7.5)
        .text(it.unit, x + 6, cy + 35, {
          width: innerW,
          lineBreak: false,
          ellipsis: true,
        });
    }
  }
  return y + rows * (cellH + gap);
}

/** Truncate string to fit given char length (rough approximation for narrow columns). */
function truncate(s: string | null | undefined, maxChars: number): string {
  if (!s) return "";
  if (s.length <= maxChars) return s;
  return s.slice(0, Math.max(0, maxChars - 1)).trimEnd() + "…";
}

// ── KBJU progress bars ───────────────────────────────────────────────────────

interface KbjuBarSpec {
  label: string;
  actual: number;
  target: number | null | undefined;
  unit: string;
}

/**
 * Draw a compact horizontal bar for one KBJU metric.
 * - If target is null/0 → only the actual value is shown (no bar), so the block
 *   still renders on profiles with an empty daily norm.
 * - Otherwise: filled portion = min(actual, target*1.4) / (target*1.4) so a
 *   large overshoot still visually fits inside the bar.
 */
function drawKbjuBar(doc: PDFDoc, x: number, y: number, width: number, spec: KbjuBarSpec): number {
  const rowH = 24;
  const labelW = 56;
  const valueW = 96;
  const barX = x + labelW;
  const barW = width - labelW - valueW - 4;
  const barH = 6;
  const barY = y + 12;

  // Label (Ккал / Б / Ж / У)
  useFont(doc, true);
  doc
    .fillColor(DARK)
    .fontSize(8.5)
    .text(spec.label, x, y + 2, {
      width: labelW,
      lineBreak: false,
    });

  if (spec.target && spec.target > 0) {
    const pct = spec.actual / spec.target;
    // Bar fill scaled so overshoots stay visible up to 140% of target.
    const capped = Math.min(spec.actual, spec.target * 1.4);
    const fillW = Math.max(1, Math.round((capped / (spec.target * 1.4)) * barW));
    // Colour by deviation from target.
    const dev = Math.abs(pct - 1);
    const color = pct > 1.3 ? BAR_OVER : dev > 0.1 ? BAR_WARN : BAR_OK;

    doc.save();
    doc.roundedRect(barX, barY, barW, barH, 3).fill(BAR_BG);
    doc.roundedRect(barX, barY, fillW, barH, 3).fill(color);
    // Target marker: thin vertical line at target = 100 %.
    const targetX = barX + Math.round((1 / 1.4) * barW);
    doc.rect(targetX - 0.5, barY - 2, 1, barH + 4).fill(DARK);
    doc.restore();

    useFont(doc);
    doc
      .fillColor(DARK)
      .fontSize(8.5)
      .text(
        `${fmt0(spec.actual)}/${fmt0(spec.target)} ${spec.unit}  ${Math.round(pct * 100)}%`,
        x + labelW + barW + 4,
        y + 2,
        { width: valueW, lineBreak: false },
      );
  } else {
    // No target configured — show the actual value only, no bar drawn.
    useFont(doc);
    doc
      .fillColor(MUTED)
      .fontSize(8.5)
      .text(`${fmt0(spec.actual)} ${spec.unit}  · норма не задана`, barX, y + 2, {
        width: barW + valueW,
        lineBreak: false,
      });
  }

  return rowH;
}

/**
 * Draw the whole KBJU vs target block: 4 bars in a 2×2 grid + a heading.
 * Returns the y-position after the block.
 */
function drawKbjuTargets(
  doc: PDFDoc,
  y: number,
  actual: { kcal: number; protein: number; fat: number; carbs: number },
  targets: KbjuTargets | null,
): number {
  const specs: KbjuBarSpec[] = [
    { label: "Ккал", actual: actual.kcal, target: targets?.kcal ?? null, unit: "ккал" },
    { label: "Белки", actual: actual.protein, target: targets?.protein ?? null, unit: "г" },
    { label: "Жиры", actual: actual.fat, target: targets?.fat ?? null, unit: "г" },
    { label: "Углеводы", actual: actual.carbs, target: targets?.carbs ?? null, unit: "г" },
  ];

  // Heading line
  useFont(doc, true);
  doc.fillColor(TEAL).fontSize(9).text("Норма КБЖУ vs факт", MARGIN, y, {
    width: CONTENT_WIDTH,
    lineBreak: false,
  });
  y += 12;

  // When every target is missing, render a single explanatory callout instead
  // of a 2×2 grid full of "норма не задана".
  if (targets === null) {
    const boxH = 26;
    doc.save();
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, boxH, 4).fillOpacity(1).fillAndStroke(BAR_BG, BORDER);
    doc.restore();
    useFont(doc, true);
    doc
      .fillColor(TEAL)
      .fontSize(9)
      .text("Нормы КБЖУ не заданы", MARGIN + 8, y + 6, {
        width: CONTENT_WIDTH - 16,
        lineBreak: false,
      });
    useFont(doc);
    doc
      .fillColor(MUTED)
      .fontSize(8.5)
      .text("Задайте целевые КБЖУ в анкете, чтобы в отчёте появилась шкала наполнения.", MARGIN + 8, y + 6 + 12, {
        width: CONTENT_WIDTH - 16,
        lineBreak: false,
      });
    return y + boxH + 4;
  }

  // 2×2 grid, gap 8pt
  const colW = (CONTENT_WIDTH - 8) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + colW + 8;

  const rowH1 = Math.max(drawKbjuBar(doc, leftX, y, colW, specs[0]), drawKbjuBar(doc, rightX, y, colW, specs[1]));
  y += rowH1;
  const rowH2 = Math.max(drawKbjuBar(doc, leftX, y, colW, specs[2]), drawKbjuBar(doc, rightX, y, colW, specs[3]));
  y += rowH2 + 4;

  return y;
}

/**
 * Bold, high-contrast "Подъём / Отбой / Шаги / Активность" line so the doctor
 * can find sleep/activity context at a glance.
 */
function drawDayMetaLine(doc: PDFDoc, y: number, day: Day): number {
  const parts: Array<{ label: string; value: string }> = [];
  if (day.wakeTime) {
    parts.push({
      label: "Подъём",
      value: `${day.wakeTime}${day.wakeDate ? ` (${fmtDate(day.wakeDate)})` : ""}`,
    });
  }
  if (day.sleepTime) {
    parts.push({
      label: "Отбой",
      value: `${day.sleepTime}${day.sleepDate ? ` (${fmtDate(day.sleepDate)})` : ""}`,
    });
  }
  if (day.steps != null) parts.push({ label: "Шаги", value: String(day.steps) });
  if (day.sportActivity) parts.push({ label: "Активность", value: truncate(day.sportActivity, 60) });

  if (!parts.length) return y;

  const fontSize = 9;
  const rowH = fontSize + 8;

  // Background stripe for legibility (very subtle teal tint).
  doc.save();
  doc.rect(MARGIN, y - 3, CONTENT_WIDTH, rowH).fill(TEAL_LIGHT);
  doc.restore();

  let x = MARGIN + 6;
  parts.forEach((p, idx) => {
    if (idx > 0) {
      useFont(doc);
      doc
        .fillColor(MUTED)
        .fontSize(fontSize)
        .text("  ·  ", x, y + 1, { lineBreak: false });
      x += doc.widthOfString("  ·  ");
    }
    useFont(doc, true);
    doc
      .fillColor(TEAL)
      .fontSize(fontSize)
      .text(`${p.label}: `, x, y + 1, { lineBreak: false });
    x += doc.widthOfString(`${p.label}: `);
    useFont(doc, true);
    doc
      .fillColor(DARK)
      .fontSize(fontSize)
      .text(p.value, x, y + 1, { lineBreak: false });
    x += doc.widthOfString(p.value);
  });

  return y + rowH + 2;
}

/**
 * Render "Комментарий дня" as a bordered callout box so it visually pops out
 * of the summary/meta area.
 */
function drawCommentBox(doc: PDFDoc, y: number, comment: string): number {
  const commentFont = 8.5;
  const paddingX = 10;
  const paddingY = 8;
  const labelH = 12;
  const bodyW = CONTENT_WIDTH - paddingX * 2;
  const maxLines = 8;

  useFont(doc);
  doc.fontSize(commentFont);
  const oneLineH = doc.heightOfString("Ag", { width: bodyW });
  const rawH = doc.heightOfString(comment, { width: bodyW });
  const clip = rawH > oneLineH * maxLines;
  const bodyH = clip ? oneLineH * maxLines : rawH;
  const boxH = paddingY * 2 + labelH + bodyH;

  // Frame
  doc.save();
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, boxH, 4).fill(TEAL_LIGHT);
  doc.lineWidth(0.75).strokeColor(TEAL).roundedRect(MARGIN, y, CONTENT_WIDTH, boxH, 4).stroke();
  doc.restore();

  // Label
  useFont(doc, true);
  doc
    .fillColor(TEAL)
    .fontSize(commentFont)
    .text("Комментарий дня", MARGIN + paddingX, y + paddingY, {
      width: bodyW,
      lineBreak: false,
    });

  // Body
  useFont(doc);
  doc
    .fillColor(DARK)
    .fontSize(commentFont)
    .text(comment, MARGIN + paddingX, y + paddingY + labelH, {
      width: bodyW,
      height: bodyH,
      ellipsis: clip,
    });

  return y + boxH + 6;
}

// ── Table renderer ───────────────────────────────────────────────────────────

interface Column {
  header: string;
  width: number; // pt
  align?: "left" | "right" | "center";
  key: string;
}

function drawTableHeader(doc: PDFDoc, cols: Column[], y: number, fontSize: number): number {
  // Header row a bit taller so short 2-line headers (e.g. "Приёмов / в день")
  // still fit without spilling into the first data row.
  const rowH = fontSize + 10;
  let x = MARGIN;
  doc.save();
  doc.rect(MARGIN, y, CONTENT_WIDTH, rowH).fill(TEAL);
  doc.restore();
  useFont(doc, true);
  doc.fillColor(WHITE);

  for (const c of cols) {
    // Auto-shrink header font so it never wraps within its column.
    let hSize = fontSize;
    const innerW = c.width - 8;
    while (hSize >= 6 && doc.fontSize(hSize).widthOfString(c.header) > innerW) {
      hSize -= 0.25;
    }
    doc
      .fillColor(WHITE)
      .fontSize(hSize)
      .text(c.header, x + 4, y + 5, {
        width: innerW,
        align: c.align ?? "left",
        lineBreak: false,
        ellipsis: true,
      });
    x += c.width;
  }
  return y + rowH;
}

/**
 * Measure the natural rendered height of a data row so wrapping cell text is
 * fully visible. The returned value already includes 3pt top and 3pt bottom
 * padding matching the drawing code below.
 */
function measureRowHeight(
  doc: PDFDoc,
  cols: Column[],
  row: Record<string, string>,
  fontSize: number,
  minRowH: number,
): number {
  useFont(doc);
  doc.fontSize(fontSize);
  let maxH = 0;
  for (const c of cols) {
    const text = row[c.key] ?? "";
    if (!text) continue;
    const h = doc.heightOfString(text, {
      width: c.width - 8,
      align: c.align ?? "left",
    });
    if (h > maxH) maxH = h;
  }
  // 3pt top + 3pt bottom padding
  return Math.max(minRowH, maxH + 6);
}

function drawTableRow(
  doc: PDFDoc,
  cols: Column[],
  row: Record<string, string>,
  y: number,
  rowH: number,
  fontSize: number,
  striped: boolean,
): void {
  if (striped) {
    doc.save();
    doc.rect(MARGIN, y, CONTENT_WIDTH, rowH).fill(BG_ROW);
    doc.restore();
  }
  let x = MARGIN;
  useFont(doc);
  doc.fillColor(DARK).fontSize(fontSize);
  for (const c of cols) {
    // No `height` clip and no `ellipsis` — let text wrap naturally within
    // the column width. Row height was pre-measured to fit the tallest cell.
    doc.text(row[c.key] ?? "", x + 4, y + 3, {
      width: c.width - 8,
      align: c.align ?? "left",
    });
    x += c.width;
  }
  // Bottom border
  doc.save();
  doc
    .strokeColor(BORDER)
    .lineWidth(0.3)
    .moveTo(MARGIN, y + rowH)
    .lineTo(MARGIN + CONTENT_WIDTH, y + rowH)
    .stroke();
  doc.restore();
}

// ── Day report (single A4 page) ──────────────────────────────────────────────

function renderDayPage(
  doc: PDFDoc,
  day: Day,
  meals: Meal[],
  patientLabel: string | null,
  targets: KbjuTargets | null = null,
): void {
  const title = "Дневник питания — отчёт врачу";
  const subtitle = `За ${fmtDate(day.date)} (${dayOfWeekShort(day.date)})`;
  let y = drawHeader(doc, title, subtitle, patientLabel);

  // Summary block
  const kcal = sumField(meals, "calories");
  const protein = sumField(meals, "protein");
  const fat = sumField(meals, "fat");
  const carbs = sumField(meals, "carbs");
  const water = totalWaterMl(meals);
  const sleep = sleepDurationHours(day);
  const avgHunger = avgOrNull(meals.map((m) => m.hungerBefore));
  const avgSatiety = avgOrNull(meals.map((m) => m.satietyAfter));

  y = drawSummaryBlock(doc, y + 4, [
    { label: "Ккал", value: fmt0(kcal), unit: "за день" },
    { label: "Б / Ж / У", value: `${fmt0(protein)}/${fmt0(fat)}/${fmt0(carbs)}`, unit: "граммы" },
    { label: "Вода", value: fmt0(water), unit: "мл" },
    { label: "Сон", value: sleep != null ? fmt1(sleep) : "—", unit: "часов" },
    { label: "Голод (ср.)", value: avgHunger != null ? fmt1(avgHunger) : "—", unit: "0–10" },
    { label: "Сытость (ср.)", value: avgSatiety != null ? fmt1(avgSatiety) : "—", unit: "0–10" },
  ]);

  // KBJU targets vs actual (bars). Renders even when targets is null — in that
  // case each bar shows only the actual value + "норма не задана".
  y = drawKbjuTargets(doc, y + 6, { kcal, protein, fat, carbs }, targets);

  // Bold sleep/steps/activity strip so the doctor can read it at a glance.
  y = drawDayMetaLine(doc, y + 2, day);

  // Day comment as a bordered callout box in the report's teal tone.
  if (day.dayComment) {
    y = drawCommentBox(doc, y + 2, day.dayComment);
  }

  // Meals table
  const sortedMeals = [...meals].sort((a, b) => (a.tsStart || "").localeCompare(b.tsStart || ""));
  const cols: Column[] = [
    { header: "Время", key: "time", width: 38 },
    { header: "Тип", key: "type", width: 50 },
    { header: "Еда", key: "food", width: 130 },
    { header: "Напитки / вода", key: "drink", width: 80 },
    { header: "Голод → Сыт.", key: "hs", width: 52, align: "center" },
    { header: "Ккал", key: "kcal", width: 30, align: "right" },
    { header: "Б/Ж/У", key: "kbju", width: 54, align: "right" },
    { header: "Заметка", key: "ctx", width: CONTENT_WIDTH - (38 + 50 + 130 + 80 + 52 + 30 + 54) },
  ];

  const fontSize = 8.5;
  const minRowH = 18;

  y = drawTableHeader(doc, cols, y, fontSize);

  if (!sortedMeals.length) {
    useFont(doc);
    doc
      .fillColor(MUTED)
      .fontSize(9)
      .text("Нет записей за день.", MARGIN, y + 8, {
        width: CONTENT_WIDTH,
        align: "center",
      });
  } else {
    sortedMeals.forEach((m, i) => {
      const kbju = `${fmt0(m.protein)}/${fmt0(m.fat)}/${fmt0(m.carbs)}`;
      const water = mealWaterMl(m);
      const drink = [m.drinkText || "", water ? `${Math.round(water)} мл` : ""].filter(Boolean).join(" · ");
      const hb = m.hungerBefore ?? "—";
      const sa = m.satietyAfter ?? "—";
      const row: Record<string, string> = {
        time: fmtTimeHM(m.tsStart),
        type: MEAL_TYPE_RU[m.mealType] ?? m.mealType,
        food: m.foodText || "",
        drink,
        hs: `${hb} → ${sa}`,
        kcal: fmt0(m.calories),
        kbju,
        ctx: m.contextNote || "",
      };
      const rowH = measureRowHeight(doc, cols, row, fontSize, minRowH);

      // Page break if this row would collide with the footer.
      const footerReserve = 40;
      if (y + rowH > PAGE_HEIGHT - footerReserve) {
        doc.addPage();
        y = drawHeader(
          doc,
          "Дневник питания — отчёт врачу",
          `За ${fmtDate(day.date)} (${dayOfWeekShort(day.date)}) · продолжение`,
          patientLabel,
        );
        y = drawTableHeader(doc, cols, y + 4, fontSize);
      }

      drawTableRow(doc, cols, row, y, rowH, fontSize, i % 2 === 1);
      y += rowH;
    });
  }

  // Footer is painted in a single pass after all content is rendered, from the
  // public entry point (`paintFootersOnAllPages`).
}

// ── Range report (multi-page) ────────────────────────────────────────────────

interface PerDayRow {
  day: Day;
  meals: Meal[];
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  water: number;
  sleep: number | null;
  avgHunger: number | null;
  avgSatiety: number | null;
  mealsCount: number;
}

function computePerDay(days: Day[], mealsByDay: Map<number, Meal[]>): PerDayRow[] {
  return [...days]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => {
      const meals = mealsByDay.get(day.id) ?? [];
      return {
        day,
        meals,
        kcal: sumField(meals, "calories"),
        protein: sumField(meals, "protein"),
        fat: sumField(meals, "fat"),
        carbs: sumField(meals, "carbs"),
        water: totalWaterMl(meals),
        sleep: sleepDurationHours(day),
        avgHunger: avgOrNull(meals.map((m) => m.hungerBefore)),
        avgSatiety: avgOrNull(meals.map((m) => m.satietyAfter)),
        mealsCount: meals.length,
      };
    });
}

function renderRangeReport(
  doc: PDFDoc,
  daysList: Day[],
  mealsByDay: Map<number, Meal[]>,
  from: string,
  to: string,
  patientLabel: string | null,
  targets: KbjuTargets | null = null,
): void {
  const rows = computePerDay(daysList, mealsByDay);
  const nDays = rows.length || 1;
  const totKcal = rows.reduce((s, r) => s + r.kcal, 0);
  const totProtein = rows.reduce((s, r) => s + r.protein, 0);
  const totFat = rows.reduce((s, r) => s + r.fat, 0);
  const totCarbs = rows.reduce((s, r) => s + r.carbs, 0);
  const totWater = rows.reduce((s, r) => s + r.water, 0);
  const totMeals = rows.reduce((s, r) => s + r.mealsCount, 0);
  const avgSleep = avgOrNull(rows.map((r) => r.sleep));
  const avgHunger = avgOrNull(rows.flatMap((r) => r.meals.map((m) => m.hungerBefore)));
  const avgSatiety = avgOrNull(rows.flatMap((r) => r.meals.map((m) => m.satietyAfter)));

  const cols: Column[] = [
    { header: "Дата", key: "date", width: 66 },
    { header: "Дн.", key: "dow", width: 28, align: "center" },
    { header: "Приёмов", key: "meals", width: 44, align: "right" },
    { header: "Ккал", key: "kcal", width: 44, align: "right" },
    { header: "Б", key: "protein", width: 36, align: "right" },
    { header: "Ж", key: "fat", width: 36, align: "right" },
    { header: "У", key: "carbs", width: 36, align: "right" },
    { header: "Вода, мл", key: "water", width: 56, align: "right" },
    { header: "Сон, ч", key: "sleep", width: 46, align: "right" },
    { header: "Голод", key: "hunger", width: 40, align: "right" },
    { header: "Сытость", key: "satiety", width: CONTENT_WIDTH - (66 + 28 + 44 + 44 + 36 + 36 + 36 + 56 + 46 + 40) },
  ];

  const fontSize = 8.5;
  const rowH = 16;
  const headerH = fontSize + 8;

  // Precompute pagination
  const first = { headerBlockH: 0, rowsCapacity: 0 };
  const followUp = { rowsCapacity: 0 };
  const footerReserve = 30;

  // We'll render the header/summary, then keep drawing rows page by page.
  let pageNum = 1;

  const startFirstPage = () => {
    const title = "Дневник питания — сводный отчёт врачу";
    const subtitle = `Период ${fmtDate(from)} — ${fmtDate(to)}  ·  Дней с записями: ${rows.length}`;
    let y = drawHeader(doc, title, subtitle, patientLabel);

    y = drawSummaryBlock(doc, y + 4, [
      { label: "Дней", value: String(rows.length), unit: `из ${nDays}` },
      { label: "Ккал/день", value: fmt0(totKcal / nDays), unit: "среднее" },
      {
        label: "Б/Ж/У среднее",
        value: `${fmt0(totProtein / nDays)}/${fmt0(totFat / nDays)}/${fmt0(totCarbs / nDays)}`,
        unit: "граммы",
      },
      { label: "Вода/день", value: fmt0(totWater / nDays), unit: "мл" },
      { label: "Сон средний", value: avgSleep != null ? fmt1(avgSleep) : "—", unit: "часов" },
      { label: "Приёмы/день", value: fmt1(totMeals / nDays), unit: "среднее" },
      { label: "Голод ср.", value: avgHunger != null ? fmt1(avgHunger) : "—", unit: "0–10" },
      { label: "Сытость ср.", value: avgSatiety != null ? fmt1(avgSatiety) : "—", unit: "0–10" },
    ]);

    // Averages vs target: on the range summary we compare the mean daily
    // intake against the personal daily norm.
    y = drawKbjuTargets(
      doc,
      y + 6,
      {
        kcal: totKcal / nDays,
        protein: totProtein / nDays,
        fat: totFat / nDays,
        carbs: totCarbs / nDays,
      },
      targets,
    );

    first.headerBlockH = y - MARGIN;
    y += 6;
    y = drawTableHeader(doc, cols, y, fontSize);
    first.rowsCapacity = Math.floor((PAGE_HEIGHT - footerReserve - y) / rowH);
    return y;
  };

  const startFollowUpPage = () => {
    doc.addPage();
    pageNum++;
    const title = "Сводный отчёт — продолжение";
    const subtitle = `Период ${fmtDate(from)} — ${fmtDate(to)}`;
    let y = drawHeader(doc, title, subtitle, patientLabel);
    y += 4;
    y = drawTableHeader(doc, cols, y, fontSize);
    followUp.rowsCapacity = Math.floor((PAGE_HEIGHT - footerReserve - y) / rowH);
    return y;
  };

  // Reserve room for the totals block (~3 lines of text) on the last page.
  const totalsReserveRows = 4;

  let y = startFirstPage();
  let rowsOnPage = 0;
  let capacity = first.rowsCapacity;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const isLastRow = i === rows.length - 1;

    // Effective capacity: reserve totals rows only on the last data row (so
    // totals block fits on the same page as the last day).
    const effectiveCapacity = isLastRow ? Math.max(1, capacity - totalsReserveRows) : capacity;

    if (rowsOnPage >= effectiveCapacity) {
      // No inline footer draw — handled in a single post-processing pass.
      y = startFollowUpPage();
      capacity = followUp.rowsCapacity;
      rowsOnPage = 0;
    }

    drawTableRow(
      doc,
      cols,
      {
        date: fmtDateShort(r.day.date),
        dow: dayOfWeekShort(r.day.date),
        meals: String(r.mealsCount),
        kcal: fmt0(r.kcal),
        protein: fmt0(r.protein),
        fat: fmt0(r.fat),
        carbs: fmt0(r.carbs),
        water: fmt0(r.water),
        sleep: r.sleep != null ? fmt1(r.sleep) : "—",
        hunger: r.avgHunger != null ? fmt1(r.avgHunger) : "—",
        satiety: r.avgSatiety != null ? fmt1(r.avgSatiety) : "—",
      },
      y,
      rowH,
      fontSize,
      i % 2 === 1,
    );
    y += rowH;
    rowsOnPage++;

    if (isLastRow) {
      // Totals footer line on the same page as the last data row.
      y += 6;
      useFont(doc, true);
      doc.fillColor(DARK).fontSize(fontSize);
      const totalsLine =
        `Итого за ${rows.length} д.: ${fmt0(totKcal)} ккал  ·  ` +
        `Б ${fmt0(totProtein)}  ·  Ж ${fmt0(totFat)}  ·  У ${fmt0(totCarbs)}  ·  ` +
        `вода ${fmt0(totWater)} мл  ·  приёмов ${totMeals}`;
      doc.text(totalsLine, MARGIN, y, { width: CONTENT_WIDTH });
    }
  }

  // Footer painted in post-processing (see paintFootersOnAllPages).
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface KbjuTargets {
  kcal?: number | null;
  protein?: number | null;
  fat?: number | null;
  carbs?: number | null;
}

export interface DoctorPdfOptions {
  patientLabel?: string | null;
  targets?: KbjuTargets | null;
}

/**
 * One-line structured log per generated report so we can verify in prod that
 * the PDF really sees the user's personal КБЖУ norm.
 */
function logDoctorPdfOptions(kind: "day" | "range", options: DoctorPdfOptions, extra?: Record<string, unknown>): void {
  try {
    const t = options.targets ?? null;
    const payload = {
      kind,
      patient: options.patientLabel ?? null,
      targetsPresent: t !== null,
      targets: t ? { kcal: t.kcal, protein: t.protein, fat: t.fat, carbs: t.carbs } : null,
      ...extra,
    };
    console.info(`[doctor-pdf] ${JSON.stringify(payload)}`);
  } catch {
    /* logging must never break rendering */
  }
}

/** Collect pdfkit output and fail the promise on stream errors (see analytics-pdf.ts). */
async function renderPdfToBuffer(render: (doc: PDFDoc) => void): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: MARGIN, autoFirstPage: true, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
  const done = new Promise<void>((resolve, reject) => {
    doc.on("end", () => resolve());
    doc.on("error", reject);
  });
  try {
    render(doc);
    doc.end();
    await done;
    return Buffer.concat(chunks);
  } catch (err) {
    try {
      doc.end();
    } catch {
      /* already ended or failed */
    }
    throw err;
  }
}

/** Compact 1-page A4 PDF report for a single day. */
export async function generateDoctorDayPdf(day: Day, meals: Meal[], options: DoctorPdfOptions = {}): Promise<Buffer> {
  logDoctorPdfOptions("day", options);
  return renderPdfToBuffer((doc) => {
    renderDayPage(doc, day, meals, options.patientLabel ?? null, options.targets ?? null);
    paintFootersOnAllPages(doc, /* legendOnLastOnly */ false);
  });
}

/** Multi-page A4 PDF for a date range (week/month/custom). */
export async function generateDoctorRangePdf(
  daysList: Day[],
  mealsByDay: Map<number, Meal[]>,
  from: string,
  to: string,
  options: DoctorPdfOptions = {},
): Promise<Buffer> {
  logDoctorPdfOptions("range", options, { from, to, days: daysList.length });
  return renderPdfToBuffer((doc) => {
    const patientLabel = options.patientLabel ?? null;
    const targets = options.targets ?? null;
    renderRangeReport(doc, daysList, mealsByDay, from, to, patientLabel, targets);

    // Per-day detail pages after the summary. Sort by day.date ascending so the
    // detail flow matches the summary table order.
    const daysSorted = [...daysList].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    for (const day of daysSorted) {
      const meals = mealsByDay.get(day.id) || [];
      doc.addPage();
      renderDayPage(doc, day, meals, patientLabel, targets);
    }

    paintFootersOnAllPages(doc, /* legendOnLastOnly */ true);
  });
}
