/**
 * UX-22: Analytics PDF export
 * Generates a multi-page PDF with:
 *   Page 1 — Cover + period summary KPIs
 *   Page 2+ — Per-day table (date, meals, kcal, protein, fat, carbs, water, sleep, steps)
 *
 * Uses pdfkit. No canvas dependency — charts are replaced with ASCII-style bar rows.
 * Color: teal #01696F (brand primary).
 */
import PDFDocument from "pdfkit";
import type { Day, Meal } from "@shared/schema";

// ── Constants ──────────────────────────────────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────────────────────

function totalWater(meals: Meal[]): number {
  return meals.reduce((sum, m) => {
    const ml = m.waterMl ?? (m.waterUnits ?? 0) * 500;
    return sum + ml / 1000;
  }, 0);
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

function fmtDate(d: string): string {
  // YYYY-MM-DD → DD.MM.YYYY
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

function fmtDateShort(d: string): string {
  const [, m, day] = d.split("-");
  return `${day}.${m}`;
}

function ruMonthYear(d: string): string {
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

// ── Mini bar (text-based sparkline) ───────────────────────────────────────────
function miniBar(value: number, max: number, width = 80): string {
  if (max <= 0) return "";
  const filled = Math.round((value / max) * width);
  return "█".repeat(Math.min(filled, width));
}

// ── Main export function ───────────────────────────────────────────────────────

export function generateAnalyticsPdf(
  days: Day[],
  mealsByDayId: Map<number, Meal[]>,
  from: string,
  to: string,
): Promise<Buffer> {
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
    const totalWaterL = days.reduce((s, day) => {
      return s + totalWater(mealsByDayId.get(day.id) ?? []);
    }, 0);
    const avgWater = filledDays > 0 ? totalWaterL / filledDays : 0;
    const avgSleep = avg(
      days.map((d) => {
        if (!d.wakeTime || !d.sleepTime) return null;
        const [wh, wm] = (d.wakeTime || "0:0").split(":").map(Number);
        const [sh, sm] = (d.sleepTime || "0:0").split(":").map(Number);
        const wake = wh + wm / 60;
        let sleep = sh + sm / 60;
        if (sleep > wake) sleep -= 24; // went to sleep before midnight ref
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

    // ╔═══════════════════════════════╗
    // ║         COVER PAGE            ║
    // ╚═══════════════════════════════╝

    // Header band
    doc.rect(0, 0, PAGE_WIDTH, 120).fill(TEAL);

    doc
      .fillColor(WHITE)
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("Аналитика питания", MARGIN, 32, { width: CONTENT_WIDTH });

    doc
      .fillColor("rgba(255,255,255,0.8)")
      .fontSize(13)
      .font("Helvetica")
      .text(`${ruMonthYear(from)} — ${ruMonthYear(to)}`, MARGIN, 68, { width: CONTENT_WIDTH });

    // Generated timestamp
    const now = new Date();
    const genDate = now.toLocaleDateString("ru-RU");
    doc
      .fillColor("rgba(255,255,255,0.65)")
      .fontSize(9)
      .text(`Сформировано ${genDate}`, MARGIN, 96, { width: CONTENT_WIDTH, align: "right" });

    // ── KPI Cards ────────────────────────────────────────────────────────────
    const kpiY = 140;
    const cardW = (CONTENT_WIDTH - 15) / 4;
    const cardH = 74;

    const kpis = [
      {
        label: "Заполнено дней",
        value: `${filledDays} / ${periodDays}`,
        sub: `${Math.round((filledDays / Math.max(periodDays, 1)) * 100)}%`,
      },
      { label: "Средние ккал/день", value: fmtNum(avgCalories), sub: `всего ${fmtNum(totalCalories)} ккал` },
      { label: "Вода ср./день", value: fmtNum(avgWater, 1) + " л", sub: `всего ${totalWaterL.toFixed(1)} л` },
      { label: "Ср. сон", value: fmtNum(avgSleep, 1) + " ч", sub: avgSteps ? `${fmtNum(avgSteps)} ш/д` : "шаги: —" },
    ];

    kpis.forEach((kpi, i) => {
      const x = MARGIN + i * (cardW + 5);
      doc.roundedRect(x, kpiY, cardW, cardH, 6).fillAndStroke(BG_LIGHT, BORDER);
      doc
        .fillColor(MUTED)
        .fontSize(8)
        .font("Helvetica")
        .text(kpi.label, x + 10, kpiY + 10, { width: cardW - 20 });
      doc
        .fillColor(DARK)
        .fontSize(18)
        .font("Helvetica-Bold")
        .text(kpi.value, x + 10, kpiY + 24, { width: cardW - 20 });
      doc
        .fillColor(MUTED)
        .fontSize(8)
        .font("Helvetica")
        .text(kpi.sub, x + 10, kpiY + 52, { width: cardW - 20 });
    });

    // ── Macros summary ───────────────────────────────────────────────────────
    const macroY = kpiY + cardH + 20;
    doc.rect(MARGIN, macroY, CONTENT_WIDTH, 1).fill(BORDER);

    doc
      .fillColor(DARK)
      .fontSize(13)
      .font("Helvetica-Bold")
      .text("Нутриенты за период", MARGIN, macroY + 12);

    const macros = [
      { label: "Белки", value: fmtNum(totalProtein, 1) + " г", color: "#16a34a" },
      { label: "Жиры", value: fmtNum(totalFat, 1) + " г", color: "#f59e0b" },
      { label: "Углеводы", value: fmtNum(totalCarbs, 1) + " г", color: "#3b82f6" },
      { label: "Ккал всего", value: fmtNum(totalCalories), color: TEAL },
    ];

    const macroRowY = macroY + 34;
    const macroColW = CONTENT_WIDTH / 4;
    macros.forEach((mac, i) => {
      const x = MARGIN + i * macroColW;
      doc.fillColor(mac.color).fontSize(9).font("Helvetica-Bold").text(mac.label, x, macroRowY, { width: macroColW });
      doc
        .fillColor(DARK)
        .fontSize(15)
        .font("Helvetica-Bold")
        .text(mac.value, x, macroRowY + 13, { width: macroColW });
    });

    // ── Hunger / Satiety summary ─────────────────────────────────────────────
    const hsY = macroRowY + 42;
    doc.rect(MARGIN, hsY, CONTENT_WIDTH, 1).fill(BORDER);
    doc
      .fillColor(DARK)
      .fontSize(13)
      .font("Helvetica-Bold")
      .text("Голод и насыщение", MARGIN, hsY + 12);

    const hsItems = [
      { label: "Средний голод до", value: fmtNum(avgHunger, 1) },
      { label: "Среднее насыщение после", value: fmtNum(avgSatiety, 1) },
      { label: "Приёмов пищи", value: String(allMeals.length) },
      { label: "Дней с активностью", value: String(days.filter((d) => d.sportActivity).length) },
    ];

    const hsItemY = hsY + 34;
    const hsColW = CONTENT_WIDTH / 4;
    hsItems.forEach((item, i) => {
      const x = MARGIN + i * hsColW;
      doc
        .fillColor(MUTED)
        .fontSize(8)
        .font("Helvetica")
        .text(item.label, x, hsItemY, { width: hsColW - 5 });
      doc
        .fillColor(DARK)
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(item.value, x, hsItemY + 13, { width: hsColW - 5 });
    });

    // ── Calories bar chart (top 20 days) ─────────────────────────────────────
    const barChartY = hsItemY + 52;
    doc.rect(MARGIN, barChartY, CONTENT_WIDTH, 1).fill(BORDER);
    doc
      .fillColor(DARK)
      .fontSize(13)
      .font("Helvetica-Bold")
      .text("Калорийность по дням", MARGIN, barChartY + 12);

    const chartStartY = barChartY + 34;
    const displayDays = days.slice(0, 28); // max 28 days on cover
    const dayCalories = displayDays.map((day) => {
      const meals = mealsByDayId.get(day.id) ?? [];
      return { date: day.date, cal: sumField(meals, "calories") ?? 0 };
    });
    const maxCal = Math.max(...dayCalories.map((d) => d.cal), 1);
    const barAreaW = CONTENT_WIDTH;
    const barH = 10;
    const barGap = 4;

    dayCalories.forEach((dc, i) => {
      const y = chartStartY + i * (barH + barGap);
      if (y + barH > PAGE_HEIGHT - MARGIN - 30) return; // don't overflow
      const barW = Math.max((dc.cal / maxCal) * (barAreaW - 80), 1);

      doc
        .fillColor(TEAL)
        .opacity(0.8)
        .rect(MARGIN + 50, y, barW, barH)
        .fill();
      doc.opacity(1);
      doc
        .fillColor(MUTED)
        .fontSize(7)
        .font("Helvetica")
        .text(fmtDateShort(dc.date), MARGIN, y + 1, { width: 45, align: "right" });
      if (dc.cal > 0) {
        doc
          .fillColor(DARK)
          .fontSize(7)
          .font("Helvetica")
          .text(`${Math.round(dc.cal)}`, MARGIN + 52 + barW + 4, y + 1);
      }
    });

    // ── Footer ───────────────────────────────────────────────────────────────
    drawFooter(doc, 1, from, to);

    // ╔═══════════════════════════════╗
    // ║         PER-DAY TABLE         ║
    // ╚═══════════════════════════════╝

    // Split into pages of ~25 rows each
    const TABLE_PAGE_ROWS = 25;
    const totalPages = Math.ceil(days.length / TABLE_PAGE_ROWS);

    for (let page = 0; page < totalPages; page++) {
      doc.addPage();
      const pageDays = days.slice(page * TABLE_PAGE_ROWS, (page + 1) * TABLE_PAGE_ROWS);

      // Page title
      doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, 28).fill(TEAL);
      doc
        .fillColor(WHITE)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("Дневник по дням", MARGIN + 8, MARGIN + 8, { width: CONTENT_WIDTH });

      // Table header
      const TABLE_Y = MARGIN + 40;
      const cols = [
        { label: "Дата", width: 50 },
        { label: "Приёмов", width: 45 },
        { label: "Ккал", width: 48 },
        { label: "Белки г", width: 45 },
        { label: "Жиры г", width: 45 },
        { label: "Углев. г", width: 45 },
        { label: "Вода л", width: 40 },
        { label: "Сон ч", width: 38 },
        { label: "Шаги", width: 45 },
        { label: "Активность", width: 114 },
      ];
      const totalColW = cols.reduce((s, c) => s + c.width, 0);
      const scaleF = CONTENT_WIDTH / totalColW;

      // Header row
      doc.rect(MARGIN, TABLE_Y, CONTENT_WIDTH, 18).fill("#E8E6E1");
      let cx = MARGIN;
      cols.forEach((col) => {
        const cw = col.width * scaleF;
        doc
          .fillColor(DARK)
          .fontSize(7.5)
          .font("Helvetica-Bold")
          .text(col.label, cx + 3, TABLE_Y + 5, { width: cw - 6 });
        cx += cw;
      });

      // Data rows
      let rowY = TABLE_Y + 20;
      pageDays.forEach((day, ri) => {
        const meals = mealsByDayId.get(day.id) ?? [];
        const cal = sumField(meals, "calories");
        const prot = sumField(meals, "protein");
        const fat = sumField(meals, "fat");
        const carb = sumField(meals, "carbs");
        const water = totalWater(meals);

        // Sleep
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

        // Alternating row color
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
          day.sportActivity ? day.sportActivity.slice(0, 20) : "—",
        ];

        cx = MARGIN;
        rowData.forEach((val, ci) => {
          const cw = cols[ci].width * scaleF;
          doc
            .fillColor(DARK)
            .fontSize(8)
            .font("Helvetica")
            .text(val, cx + 3, rowY + 4, { width: cw - 6, lineBreak: false });
          cx += cw;
        });

        // Bottom border
        doc.rect(MARGIN, rowY + 15, CONTENT_WIDTH, 0.5).fill(BORDER);
        rowY += 16;
      });

      drawFooter(doc, page + 2, from, to);
    }

    doc.end();
  });
}

function drawFooter(doc: InstanceType<typeof PDFDocument>, pageNum: number, from: string, to: string) {
  const footerY = PAGE_HEIGHT - 28;
  doc.rect(0, footerY, PAGE_WIDTH, 28).fill("#F0EFEC");
  doc
    .fillColor(MUTED)
    .fontSize(8)
    .font("Helvetica")
    .text(`Food Diary V2 — Аналитика ${from} — ${to}`, MARGIN, footerY + 9, { width: CONTENT_WIDTH / 2 });
  doc
    .fillColor(MUTED)
    .fontSize(8)
    .font("Helvetica")
    .text(`Стр. ${pageNum}`, MARGIN, footerY + 9, { width: CONTENT_WIDTH, align: "right" });
}
