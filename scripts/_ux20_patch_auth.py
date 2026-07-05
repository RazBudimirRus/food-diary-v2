import re

path = "/home/user/workspace/food-diary-v2/server/routes/auth.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_block = '''  /** PUT /api/user/profile */
  app.put("/api/user/profile", requireAuth, (req: AuthRequest, res) => {
    const parsed = upsertUserProfileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      const profile = storage.upsertUserProfile(req.user!.id, parsed.data);
      res.json({ profile });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });'''

assert old_block in content, "old_block not found"

new_block = '''  /**
   * UX-20: Формула Миффлина-Сан Жеор — серверный пересчёт КБЖУ.
   * Используется, когда антропометрические поля меняются и kbjuManual === false.
   */
  function calcKbzhuServer(
    gender: string | null | undefined,
    heightCm: number | null | undefined,
    weightKg: number | null | undefined,
    activity: string | null | undefined,
  ): { targetKcal: number; targetProtein: number; targetFat: number; targetCarbs: number } | null {
    if (!heightCm || !weightKg || !gender || gender === "unspecified") return null;
    const ACTIVITY_COEFF: Record<string, number> = { minimal: 1.2, medium: 1.55, high: 1.725 };
    const age = 30; // возраст не запрашивается — нейтральное значение
    const bmr =
      gender === "male"
        ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
        : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    const tdee = Math.round(bmr * (ACTIVITY_COEFF[activity ?? "medium"] ?? 1.55));
    const targetProtein = Math.round((tdee * 0.25) / 4);
    const targetFat = Math.round((tdee * 0.3) / 9);
    const targetCarbs = Math.round((tdee * 0.45) / 4);
    return { targetKcal: tdee, targetProtein, targetFat, targetCarbs };
  }

  /** PUT /api/user/profile */
  app.put("/api/user/profile", requireAuth, (req: AuthRequest, res) => {
    const parsed = upsertUserProfileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      const userId = req.user!.id;
      const existing = storage.getUserProfile(userId);
      const data = { ...parsed.data } as typeof parsed.data;

      const kbjuFieldsProvided =
        data.targetKcal !== undefined ||
        data.targetProtein !== undefined ||
        data.targetFat !== undefined ||
        data.targetCarbs !== undefined;

      // Если КБЖУ поля переданы явно — это ручной ввод, приоритет за пользователем.
      if (kbjuFieldsProvided) {
        data.kbjuManual = true;
      }

      const anthropometricChanged =
        data.heightCm !== undefined || data.weightKg !== undefined || data.activityLevel !== undefined || data.gender !== undefined;

      const effectiveKbjuManual = data.kbjuManual ?? existing?.kbjuManual ?? false;

      // Пересчитываем КБЖУ автоматически, только если антропометрия изменилась
      // и КБЖУ поля не были явно переданы, и ручной режим не включён.
      if (anthropometricChanged && !kbjuFieldsProvided && !effectiveKbjuManual) {
        const gender = data.gender ?? existing?.gender ?? "unspecified";
        const heightCm = data.heightCm ?? existing?.heightCm ?? null;
        const weightKg = data.weightKg ?? existing?.weightKg ?? null;
        const activityLevel = data.activityLevel ?? existing?.activityLevel ?? "medium";
        const calc = calcKbzhuServer(gender, heightCm, weightKg, activityLevel);
        if (calc) {
          data.targetKcal = calc.targetKcal;
          data.targetProtein = calc.targetProtein;
          data.targetFat = calc.targetFat;
          data.targetCarbs = calc.targetCarbs;
        }
      }

      const profile = storage.upsertUserProfile(userId, data);
      res.json({ profile });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });'''

content = content.replace(old_block, new_block)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("patched")
