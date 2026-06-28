/**
 * Excel report generator — produces a .xlsx file matching the doctor's format.
 * Spec: doc 07_Формат_отчёта_Excel.md
 */
import ExcelJS from "exceljs";
import type { Day, Meal } from "@shared/schema";
import { formatDateTimeRu, resolveSleepDate, resolveWakeDate } from "@shared/dates";

const MEAL_TYPES_ORDER = ["завтрак", "обед", "перекус", "ужин"];

const TOTAL_COLS = 8;

function sortMeals(meals: Meal[]): Meal[] {
  return [...meals].sort((a, b) => {
    const t = a.tsStart.localeCompare(b.tsStart);
    if (t !== 0) return t;
    return MEAL_TYPES_ORDER.indexOf(a.mealType) - MEAL_TYPES_ORDER.indexOf(b.mealType);
  });
}

/** Calculate total water in litres from all meals */
function totalWater(meals: Meal[]): number {
  return meals.reduce((sum, m) => sum + (m.waterUnits ?? 0) * 0.5, 0);
}

/** Average of a numeric array, rounded to 1 decimal */
function avg(values: (number | null | undefined)[]): string {
  const nums = values.filter((v) => v != null) as number[];
  if (!nums.length) return "—";
  return (nums.reduce((s, v) => s + v, 0) / nums.length).toFixed(1);
}

/** Sum a nutrient field across meals that have КБЖУ data; returns "—" if none */
function sumNutrient(meals: Meal[], field: "calories" | "protein" | "fat" | "carbs"): string {
  const vals = meals.map((m) => m[field]).filter((v): v is number => v != null && !isNaN(v));
  if (!vals.length) return "—";
  const total = vals.reduce((s, v) => s + v, 0);
  return field === "calories" ? String(Math.round(total)) : total.toFixed(1);
}

const HUNGER_SCALE = [
  { level: 0, title: "Экстремальный голод", desc: "Тошнота, болезненные спазмы в желудке", zone: "red" },
  {
    level: 1,
    title: "Сильный голод и острая потребность в еде",
    desc: "Раздражительность, спазмы и урчание в животе",
    zone: "red",
  },
  { level: 2, title: "Ощутимый голод", desc: "Настоятельная потребность подкрепиться", zone: "red" },
  { level: 3, title: "Основательно проголодался", desc: "Срочно нужно поесть", zone: "green" },
  { level: 4, title: "Лёгкий голод", desc: "Легко отвлечься от ощущений в организме", zone: "green" },
  { level: 5, title: "Ни сыт, ни голоден", desc: "Комфортное состояние, можно не думать о еде", zone: "green" },
  {
    level: 6,
    title: "Лёгкая сытость",
    desc: "Ощущение после лёгкого перекуса, начинаю испытывать удовлетворение",
    zone: "green",
  },
  {
    level: 7,
    title: "Комфортная сытость",
    desc: "Ощущение приятной сытости, полной удовлетворённости и расслабленности. Пора остановиться.",
    zone: "green",
  },
  { level: 8, title: "Съел больше, чем требовалось", desc: "Начинаю чувствовать, что слегка переел", zone: "red" },
  {
    level: 9,
    title: "Дискомфорт от переедания",
    desc: "Чувство распирания в животе, хочется расстегнуть пуговицу на брюках",
    zone: "red",
  },
  {
    level: 10,
    title: "Экстремальное переедание",
    desc: "Объелся так сильно, что еда стоит в горле, живот распирает до спазмов и боли, подташнивает",
    zone: "red",
  },
];

function populateDaySheet(ws: ExcelJS.Worksheet, day: Day, meals: Meal[]): void {
  const sorted = sortMeals(meals);

  // ── Column widths ─────────────────────────────────────────────────────────
  ws.columns = [
    { key: "A", width: 18 }, // A: интервал
    { key: "B", width: 14 }, // B: голод
    { key: "C", width: 14 }, // C: тип приёма
    { key: "D", width: 40 }, // D: что ел
    { key: "E", width: 30 }, // E: что пил
    { key: "F", width: 16 }, // F: насыщение
    { key: "G", width: 40 }, // G: контекст
    { key: "H", width: 34 }, // H: КБЖУ
  ];

  let rowNum = 1;

  // ── Title ─────────────────────────────────────────────────────────────────
  const titleCell = ws.getCell(rowNum, 1);
  titleCell.value = `Дневник питания — ${day.date.split("-").reverse().join(".")}`;
  titleCell.font = { bold: true, size: 14 };
  ws.mergeCells(rowNum, 1, rowNum, TOTAL_COLS);
  titleCell.alignment = { horizontal: "center" };
  rowNum++;
  rowNum++; // blank

  // ── Table header ──────────────────────────────────────────────────────────
  const headers = [
    "Приём пищи (интервал)",
    "Голод до (0–10)",
    "Тип приёма",
    "Что ел",
    "Что пил\n(1 вода = 0.5 л)",
    "Насыщение после (0–10)",
    "Контекст приёма",
    "КБЖУ (DeepSeek)\nккал / Б / Ж / У",
  ];
  const hRow = ws.getRow(rowNum);
  headers.forEach((h, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9EAD3" } };
    cell.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });
  hRow.height = 32;
  rowNum++;

  // ── Meal rows ─────────────────────────────────────────────────────────────
  for (const m of sorted) {
    const interval = m.tsEnd && m.tsEnd !== m.tsStart ? `${m.tsStart}–${m.tsEnd}` : m.tsStart;
    const drinkDisplay = m.drinkText ?? (m.waterUnits ? `вода ${m.waterUnits}` : "");

    let kbjuText = "";
    if (m.calories != null) {
      const protein = m.protein != null ? m.protein.toFixed(1) : "—";
      const fat = m.fat != null ? m.fat.toFixed(1) : "—";
      const carbs = m.carbs != null ? m.carbs.toFixed(1) : "—";
      kbjuText = `${Math.round(m.calories)} ккал / Б${protein} / Ж${fat} / У${carbs}`;
    }

    const values = [
      interval,
      m.hungerBefore != null ? String(m.hungerBefore) : "",
      m.mealType,
      m.foodText ?? "",
      drinkDisplay,
      m.satietyAfter != null ? String(m.satietyAfter) : "",
      m.contextNote ?? "",
      kbjuText,
    ];
    const mRow = ws.getRow(rowNum);
    values.forEach((v, i) => {
      const cell = mRow.getCell(i + 1);
      cell.value = v;
      cell.alignment = { wrapText: true, vertical: "top" };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });
    mRow.height = 20;
    rowNum++;
  }

  rowNum++; // blank

  // ── КБЖУ итого за день ────────────────────────────────────────────────────
  const kbjuSectionLabel = ws.getCell(rowNum, 1);
  kbjuSectionLabel.value = "КБЖУ за день (DeepSeek)";
  kbjuSectionLabel.font = { bold: true, size: 11, color: { argb: "FF1F497D" } };
  ws.mergeCells(rowNum, 1, rowNum, TOTAL_COLS);
  rowNum++;

  const kbjuTotals: [string, string][] = [
    ["Калорийность, ккал", sumNutrient(sorted, "calories")],
    ["Белки, г", sumNutrient(sorted, "protein")],
    ["Жиры, г", sumNutrient(sorted, "fat")],
    ["Углеводы, г", sumNutrient(sorted, "carbs")],
  ];
  for (const [label, val] of kbjuTotals) {
    const r = ws.getRow(rowNum);
    const lc = r.getCell(1);
    lc.value = label;
    lc.font = { bold: true };
    lc.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
    ws.mergeCells(rowNum, 1, rowNum, 2);

    const vc = r.getCell(3);
    vc.value = val;
    vc.alignment = { horizontal: "center" };
    vc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F4FD" } };
    vc.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
    ws.mergeCells(rowNum, 3, rowNum, TOTAL_COLS);

    rowNum++;
  }

  rowNum++; // blank

  // ── Итоги дня (левая + правая) ────────────────────────────────────────────
  const daySummaryLabel = ws.getCell(rowNum, 1);
  daySummaryLabel.value = "Итоги дня";
  daySummaryLabel.font = { bold: true, size: 12 };
  ws.mergeCells(rowNum, 1, rowNum, TOTAL_COLS);
  rowNum++;

  const wakeDisplay = day.wakeTime
    ? formatDateTimeRu(resolveWakeDate(day.date, day.wakeDate) ?? day.date, day.wakeTime)
    : "";
  const sleepDisplay = day.sleepTime
    ? formatDateTimeRu(resolveSleepDate(day.date, day.sleepTime, day.sleepDate) ?? day.date, day.sleepTime)
    : "";

  const leftFields: [string, string][] = [
    ["Подъём", wakeDisplay],
    ["Отбой", sleepDisplay],
    ["Спорт / активность", day.sportActivity ?? ""],
    ["Шаги за день", day.steps != null ? String(day.steps) : ""],
  ];

  for (const [label, val] of leftFields) {
    const r = ws.getRow(rowNum);
    const lCell = r.getCell(1);
    lCell.value = label;
    lCell.font = { bold: true };
    lCell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
    ws.mergeCells(rowNum, 1, rowNum, 2);

    const vCell = r.getCell(3);
    vCell.value = val;
    vCell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
    ws.mergeCells(rowNum, 3, rowNum, 4);

    // right: комментарий дня (only on first row, spans all right)
    if (label === "Подъём") {
      const commentLabel = r.getCell(5);
      commentLabel.value = "Общий комментарий дня:";
      commentLabel.font = { bold: true };
      ws.mergeCells(rowNum, 5, rowNum, 5);

      const commentText = day.dayComment ?? "";
      const commentVal = ws.getCell(rowNum + 1, 5);
      commentVal.value = commentText;
      commentVal.alignment = { wrapText: true, vertical: "top" };
      commentVal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFACD" } };
      // UX-8: dynamic row height + dynamic merged-row span based on comment length
      const commentRowHeight = Math.max(40, Math.ceil(commentText.length / 55) * 16);
      ws.getRow(rowNum + 1).height = commentRowHeight;
      const mergeRowSpan = commentText.length > 200 ? 5 : 3;
      ws.mergeCells(rowNum + 1, 5, rowNum + mergeRowSpan, TOTAL_COLS);
    }
    rowNum++;
  }

  rowNum++;
  rowNum++;

  // ── Auto totals ───────────────────────────────────────────────────────────
  const totalsLabel = ws.getCell(rowNum, 1);
  totalsLabel.value = "Автоматические итоги за день";
  totalsLabel.font = { bold: true, size: 12 };
  ws.mergeCells(rowNum, 1, rowNum, TOTAL_COLS);
  rowNum++;

  const totalsHeaders = ["Показатель", "По версии Бота", "По версии Врача"];
  const tHRow = ws.getRow(rowNum);
  totalsHeaders.forEach((h, i) => {
    const c = tHRow.getCell(i + 1);
    c.value = h;
    c.font = { bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9EAD3" } };
    c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
    c.alignment = { horizontal: "center" };
  });
  ws.mergeCells(rowNum, 1, rowNum, 1);
  ws.mergeCells(rowNum, 2, rowNum, 4);
  ws.mergeCells(rowNum, 5, rowNum, TOTAL_COLS);
  rowNum++;

  const totalRows: [string, string][] = [
    ["Калорийность, ккал", sumNutrient(sorted, "calories")],
    ["Белки, г", sumNutrient(sorted, "protein")],
    ["Жиры, г", sumNutrient(sorted, "fat")],
    ["Углеводы, г", sumNutrient(sorted, "carbs")],
    ["Вода, л", totalWater(meals).toFixed(1)],
    ["Кол-во приёмов пищи", String(meals.length)],
    [`Средний голод (0–10)`, avg(meals.map((m) => m.hungerBefore))],
    [`Среднее насыщение (0–10)`, avg(meals.map((m) => m.satietyAfter))],
  ];

  for (const [label, botVal] of totalRows) {
    const r = ws.getRow(rowNum);
    const lc = r.getCell(1);
    lc.value = label;
    lc.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };

    const bc = r.getCell(2);
    bc.value = botVal;
    bc.alignment = { horizontal: "center" };
    bc.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
    ws.mergeCells(rowNum, 2, rowNum, 4);

    const dc = r.getCell(5);
    dc.value = "";
    dc.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
    ws.mergeCells(rowNum, 5, rowNum, TOTAL_COLS);

    rowNum++;
  }

  rowNum++;
  rowNum++;

  // ── Hunger scale legend ───────────────────────────────────────────────────
  const legendTitle = ws.getCell(rowNum, 1);
  legendTitle.value = "ШКАЛА ГОЛОДА И НАСЫЩЕНИЯ";
  legendTitle.font = { bold: true, size: 11 };
  ws.mergeCells(rowNum, 1, rowNum, TOTAL_COLS);
  rowNum++;

  const legendHeaders = ["Уровень", "Заголовок", "Описание"];
  const lhRow = ws.getRow(rowNum);
  legendHeaders.forEach((h, i) => {
    const c = lhRow.getCell(i + 1);
    c.value = h;
    c.font = { bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
    c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });
  ws.mergeCells(rowNum, 1, rowNum, 1);
  ws.mergeCells(rowNum, 2, rowNum, 3);
  ws.mergeCells(rowNum, 4, rowNum, TOTAL_COLS);
  rowNum++;

  for (const item of HUNGER_SCALE) {
    const r = ws.getRow(rowNum);
    const bgColor = item.zone === "red" ? "FFFFC7CE" : "FFC6EFCE";

    const lc = r.getCell(1);
    lc.value = item.level;
    lc.alignment = { horizontal: "center" };
    lc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
    lc.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };

    const tc = r.getCell(2);
    tc.value = item.title;
    tc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
    tc.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
    ws.mergeCells(rowNum, 2, rowNum, 3);

    const dc = r.getCell(4);
    dc.value = item.desc;
    dc.alignment = { wrapText: true };
    dc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
    dc.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
    ws.mergeCells(rowNum, 4, rowNum, TOTAL_COLS);

    rowNum++;
  }

  // ── Page setup ────────────────────────────────────────────────────────────
  ws.pageSetup.orientation = "landscape";
  ws.pageSetup.fitToPage = true;
  ws.pageSetup.fitToWidth = 1;
  ws.pageSetup.fitToHeight = 0;
}

export async function generateDayReport(day: Day, meals: Meal[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "FoodDiary Bot";
  const ws = wb.addWorksheet("Дневник питания");
  populateDaySheet(ws, day, meals);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const DAYS_RU_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

function dayOfWeekShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return DAYS_RU_SHORT[new Date(y, m - 1, d).getDay()];
}

function r1(value: number): number {
  return Math.round(value * 10) / 10;
}

function sumField(meals: Meal[], field: "calories" | "protein" | "fat" | "carbs"): number {
  return meals.reduce((s, m) => {
    const v = m[field];
    return s + (v != null && !isNaN(v) ? v : 0);
  }, 0);
}

/**
 * Фаза 21 — Extended range report.
 * First sheet "Сводка" (totals + averages + per-day table), then one sheet per day.
 */
export async function generateRangeReport(daysList: Day[], mealsByDay: Map<number, Meal[]>): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "FoodDiary Bot";

  const sortedDays = [...daysList].sort((a, b) => a.date.localeCompare(b.date));
  const startDate = sortedDays.length ? sortedDays[0].date : "";
  const endDate = sortedDays.length ? sortedDays[sortedDays.length - 1].date : "";

  const summary = wb.addWorksheet("Сводка");
  summary.columns = [
    { width: 16 },
    { width: 12 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 12 },
    { width: 12 },
  ];

  let row = 1;
  const titleCell = summary.getCell(row, 1);
  titleCell.value = `Сводный отчёт ${startDate.split("-").reverse().join(".")} — ${endDate.split("-").reverse().join(".")}`;
  titleCell.font = { bold: true, size: 14 };
  summary.mergeCells(row, 1, row, 8);
  titleCell.alignment = { horizontal: "center" };
  row += 2;

  let totKcal = 0,
    totProtein = 0,
    totFat = 0,
    totCarbs = 0,
    totWater = 0,
    totMeals = 0;
  const perDay = sortedDays.map((day) => {
    const dayMeals = mealsByDay.get(day.id) ?? [];
    const kcal = sumField(dayMeals, "calories");
    const protein = sumField(dayMeals, "protein");
    const fat = sumField(dayMeals, "fat");
    const carbs = sumField(dayMeals, "carbs");
    const water = totalWater(dayMeals);
    totKcal += kcal;
    totProtein += protein;
    totFat += fat;
    totCarbs += carbs;
    totWater += water;
    totMeals += dayMeals.length;
    return { day, dayMeals, kcal, protein, fat, carbs, water };
  });
  const nDays = sortedDays.length || 1;

  const statBlock: [string, string, string][] = [
    ["Показатель", "Всего", "В среднем за день"],
    ["Калорийность, ккал", String(Math.round(totKcal)), String(Math.round(totKcal / nDays))],
    ["Белки, г", r1(totProtein).toFixed(1), r1(totProtein / nDays).toFixed(1)],
    ["Жиры, г", r1(totFat).toFixed(1), r1(totFat / nDays).toFixed(1)],
    ["Углеводы, г", r1(totCarbs).toFixed(1), r1(totCarbs / nDays).toFixed(1)],
    ["Вода, л", r1(totWater).toFixed(1), r1(totWater / nDays).toFixed(1)],
    ["Кол-во приёмов пищи", String(totMeals), r1(totMeals / nDays).toFixed(1)],
  ];
  for (const [a, b, c] of statBlock) {
    const r = summary.getRow(row);
    const isHeader = a === "Показатель";
    [a, b, c].forEach((val, i) => {
      const cell = r.getCell(i + 1);
      cell.value = val;
      if (isHeader) {
        cell.font = { bold: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9EAD3" } };
      } else if (i === 0) {
        cell.font = { bold: true };
      }
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });
    summary.mergeCells(row, 1, row, 4);
    summary.mergeCells(row, 5, row, 6);
    summary.mergeCells(row, 7, row, 8);
    row++;
  }
  row += 1;

  const tableLabel = summary.getCell(row, 1);
  tableLabel.value = "По дням";
  tableLabel.font = { bold: true, size: 12 };
  summary.mergeCells(row, 1, row, 8);
  row++;

  const dayHeaders = ["Дата", "ккал", "Б", "Ж", "У", "Вода, л", "Приёмы", "Коммент."];
  const dhRow = summary.getRow(row);
  dayHeaders.forEach((h, i) => {
    const c = dhRow.getCell(i + 1);
    c.value = h;
    c.font = { bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9EAD3" } };
    c.alignment = { horizontal: "center" };
    c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });
  row++;

  for (const { day, dayMeals, kcal, protein, fat, carbs, water } of perDay) {
    const r = summary.getRow(row);
    const vals = [
      `${day.date.split("-").reverse().slice(0, 2).join(".")} (${dayOfWeekShort(day.date)})`,
      kcal > 0 ? String(Math.round(kcal)) : "—",
      protein > 0 ? r1(protein).toFixed(1) : "—",
      fat > 0 ? r1(fat).toFixed(1) : "—",
      carbs > 0 ? r1(carbs).toFixed(1) : "—",
      r1(water).toFixed(1),
      String(dayMeals.length),
      day.dayComment ? "✓" : "—",
    ];
    vals.forEach((v, i) => {
      const c = r.getCell(i + 1);
      c.value = v;
      if (i > 0) c.alignment = { horizontal: "center" };
      c.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });
    row++;
  }

  summary.pageSetup.orientation = "landscape";
  summary.pageSetup.fitToPage = true;
  summary.pageSetup.fitToWidth = 1;
  summary.pageSetup.fitToHeight = 0;

  const usedNames = new Set<string>(["Сводка"]);
  for (const day of sortedDays) {
    const dm = day.date.split("-").reverse().slice(0, 2).join(".");
    let name = `${dm} (${dayOfWeekShort(day.date)})`;
    let suffix = 1;
    const base = name;
    while (usedNames.has(name)) {
      name = `${base} ${++suffix}`;
    }
    usedNames.add(name);
    const ws = wb.addWorksheet(name.slice(0, 31));
    populateDaySheet(ws, day, mealsByDay.get(day.id) ?? []);
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
