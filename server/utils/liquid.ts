/**
 * parseLiquidMl — extracts liquid volume in millilitres from free-form Russian/English text.
 *
 * Returns null when no volume can be reliably determined.
 *
 * Examples:
 *   "500 мл сока"     → 500
 *   "0.5 л чай"       → 500
 *   "1.5л компота"    → 1500
 *   "1 l juice"       → 1000
 *   "2 стакана воды"  → 400  (1 стакан = 200 мл)
 *   "кружка кофе"     → 250  (heuristic)
 *   "стакан"          → 200  (heuristic)
 *   "чай"             → null (no volume clue)
 */
export function parseLiquidMl(text: string | null | undefined): number | null {
  if (!text || !text.trim()) return null;
  const t = text.toLowerCase().trim();

  // ── 1. Explicit ml / мл ──────────────────────────────────────────────────
  const mlMatch = t.match(/(\d+(?:[.,]\d+)?)\s*(?:мл|ml)/);
  if (mlMatch) return Math.round(parseFloat(mlMatch[1].replace(",", ".")));

  // ── 2. Explicit l / л / литр / litre / liter ─────────────────────────────
  // Note: \b doesn't work with Cyrillic; use negative look-ahead for Ru,
  // and negative look-ahead for En to avoid matching "limonchik" etc.
  const lMatch = t.match(/(\d+(?:[.,]\d+)?)\s*(?:литр(?:а|ов)?|л(?![а-яёa-z])|litre?s?|l(?![a-z]))/);
  if (lMatch) return Math.round(parseFloat(lMatch[1].replace(",", ".")) * 1000);

  // ── 3. Count + vessel keyword ─────────────────────────────────────────────
  const countVessel = t.match(/(\d+(?:[.,]\d+)?)\s*(стакан|кружк|чашк|бутылк|банк)/);
  if (countVessel) {
    const count = parseFloat(countVessel[1].replace(",", "."));
    const vessel = countVessel[2];
    const vol = vesselMl(vessel);
    if (vol !== null) return Math.round(count * vol);
  }

  // ── 4. Lone vessel keyword (no count → assume 1) ──────────────────────────
  if (/стакан/.test(t)) return 200;
  if (/кружк/.test(t)) return 250;
  if (/чашк/.test(t)) return 200;
  if (/бутылк/.test(t)) {
    // "бутылка" alone defaults to 500 ml (standard water bottle)
    return 500;
  }
  if (/банк/.test(t)) {
    // "банка" alone defaults to 330 ml (standard can)
    return 330;
  }

  return null;
}

/** Volume in ml for a given Russian vessel root */
function vesselMl(root: string): number | null {
  if (root.startsWith("стакан")) return 200;
  if (root.startsWith("кружк")) return 250;
  if (root.startsWith("чашк")) return 200;
  if (root.startsWith("бутылк")) return 500;
  if (root.startsWith("банк")) return 330;
  return null;
}

/**
 * Compute total water for a meal in millilitres.
 * waterUnits × 500 ml + parsed drinkText.
 * Returns 0 when both are absent/zero.
 */
export function mealWaterMl(waterUnits: number | null | undefined, drinkText: string | null | undefined): number {
  const fromUnits = (waterUnits ?? 0) * 500;
  const fromText = parseLiquidMl(drinkText) ?? 0;
  return fromUnits + fromText;
}
