/**
 * UX-22: Analytics PDF export
 * Generates a multi-page PDF with:
 *   Page 1 — Cover + period summary KPIs + calorie bar chart
 *   Page 2+ — Per-day table
 *
 * Uses pdfkit with embedded Inter TTF (with full Cyrillic support).
 * Fonts are downloaded on first use from Google Fonts and cached in DATA_DIR/fonts/.
 */
import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import type { Day, Meal } from "@shared/schema";

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

const MARGIN = 40;
const PAGE_WIDTH = 595; // A4
const PAGE_HEIGHT = 842; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

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

// ── pdfkit font helper ────────────────────────────────────────────────────────

function useFont(doc: InstanceType<typeof PDFDocument>, bold = false): string {
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

  doc
    .fillColor(MUTED)
    .fontSize(8)
    .text(`Food Diary V2 — Аналитика ${from} — ${to}`, MARGIN, footerY + 9, {
      width: CONTENT_WIDTH / 2,
    });
  doc
    .fillColor(MUTED)
    .fontSize(8)
    .text(`Стр. ${pageNum}`, MARGIN, footerY + 9, {
      width: CONTENT_WIDTH,
      align: "right",
    });
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

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    const doc = new PDFDocument({
      size: "A4",
      margin: MARGIN,
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

    // ── Pre-compute summary ──────────────────────────────────────────────────
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

    const avgSleep = avg(
      days.map((d) => {
        if (!d.wakeTime || !d.sleepTime) return null;
        const [wh, wm] = d.wakeTime.split(":").map(Number);
        const [sh, sm] = d.sleepTime.split(":").map(Number);
        const wake = wh + wm / 60;
        let sleep = sh + sm / 60;
        if (sleep > wake) sleep -= 24;
        const dur = wake - sleep;
        return dur > 0 && dur < 24 ? dur : null;
      }),
    );

    const avgSteps = avg(days.map((d) => d.steps));
    const hungerVals = allMeals.map((m) => m.hungerBefore).filter((v): v is number => v != null);
    const avgHunger = hungerVals.length ? hungerVals.reduce((s, v) => s + v, 0) / hungerVals.length : null;
    const satietyVals = allMeals.map((m) => m.satietyAfter).filter((v): v is number => v != null);
    const avgSatiety = satietyVals.length ? satietyVals.reduce((s, v) => s + v, 0) / satietyVals.length : null;
    const periodDays = days.length;

    // ╔══════════════════════════════╗
    // ║         COVER PAGE           ║
    // ╚══════════════════════════════╝

    // Header band
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
      { label: "Белки", value: `${fmtNum(totalProtein, 1)} г`, color: "#16a34a" },
      { label: "Жиры", value: `${fmtNum(totalFat, 1)} г`, color: "#f59e0b" },
      { label: "Углеводы", value: `${fmtNum(totalCarbs, 1)} г`, color: "#3b82f6" },
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

    // ── Calorie bar chart ─────────────────────────────────────────────────────
    const barChartY = hsItemY + 44;
    doc.rect(MARGIN, barChartY, CONTENT_WIDTH, 0.5).fill(BORDER);
    doc
      .font(BOLD)
      .fillColor(DARK)
      .fontSize(12)
      .text("Калорийность по дням", MARGIN, barChartY + 10);

    const chartStartY = barChartY + 32;
    const displayDays = days.slice(0, 30);
    const dayCalories = displayDays.map((day) => ({
      date: day.date,
      cal: sumField(mealsByDayId.get(day.id) ?? [], "calories") ?? 0,
    }));
    const maxCal = Math.max(...dayCalories.map((d) => d.cal), 1);
    const barH = 11;
    const barGap = 3;
    const labelW = 38;
    const barAreaW = CONTENT_WIDTH - labelW - 40;

    dayCalories.forEach((dc, i) => {
      const y = chartStartY + i * (barH + barGap);
      if (y + barH > PAGE_HEIGHT - MARGIN - 32) return;
      const barW = Math.max((dc.cal / maxCal) * barAreaW, dc.cal > 0 ? 2 : 0);

      // Date label
      doc
        .font(REG)
        .fillColor(MUTED)
        .fontSize(7)
        .text(fmtDateShort(dc.date), MARGIN, y + 2, { width: labelW - 2, align: "right" });

      // Bar
      if (barW > 0) {
        doc.rect(MARGIN + labelW, y, barW, barH).fill(TEAL);
      }

      // Value label
      if (dc.cal > 0) {
        doc
          .font(REG)
          .fillColor(DARK)
          .fontSize(7)
          .text(`${Math.round(dc.cal)}`, MARGIN + labelW + barW + 4, y + 2);
      }
    });

    drawFooter(doc, 1, from, to, hasCyrillic);

    // ╔══════════════════════════════╗
    // ║       PER-DAY TABLE          ║
    // ╚══════════════════════════════╝

    const TABLE_PAGE_ROWS = 25;
    const totalPages = Math.ceil(days.length / TABLE_PAGE_ROWS);

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

        let sleepH: number | null = null;
        if (day.wakeTime && day.sleepTime) {
          const [wh, wm] = day.wakeTime.split(":").map(Number);
          const [sh, sm] = day.sleepTime.split(":").map(Number);
          const wake = wh + wm / 60;
          let sleep = sh + sm / 60;
          if (sleep > wake) sleep -= 24;
          const dur = wake - sleep;
          if (dur > 0 && dur < 24) sleepH = dur;
        }

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

      drawFooter(doc, page + 2, from, to, hasCyrillic);
    }

    doc.end();
  });
}
