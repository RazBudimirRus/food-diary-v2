path = "/home/user/workspace/food-diary-v2/client/src/components/ProfileQuestionnaire.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# a) add kbjuManual state
old_state = '  const [targetCarbs, setTargetCarbs] = useState("");\n  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);'
new_state = '  const [targetCarbs, setTargetCarbs] = useState("");\n  const [kbjuManual, setKbjuManual] = useState(false);\n  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);'
assert old_state in content
content = content.replace(old_state, new_state)

# b) load kbjuManual in useEffect
old_load = '        setTargetCarbs(p.targetCarbs != null ? String(p.targetCarbs) : "");\n      })'
new_load = '        setTargetCarbs(p.targetCarbs != null ? String(p.targetCarbs) : "");\n        setKbjuManual(p.kbjuManual ?? false);\n      })'
assert old_load in content
content = content.replace(old_load, new_load)

# c) update auto-recalc useEffect
old_effect = '''  // Автопересчёт КБЖУ при изменении пола/роста/веса/активности
  useEffect(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (!h || !w) return;
    const result = calcKbzhu(gender, h, w, activity);
    if (!result) return;
    setTargetKcal(String(result.kcal));
    setTargetProtein(String(result.protein));
    setTargetFat(String(result.fat));
    setTargetCarbs(String(result.carbs));
  }, [gender, height, weight, activity]);'''
new_effect = '''  // Автопересчёт КБЖУ при изменении пола/роста/веса/активности
  useEffect(() => {
    if (kbjuManual) return; // manual override — don't touch КБЖУ
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (!h || !w) return;
    const result = calcKbzhu(gender, h, w, activity);
    if (!result) return;
    setTargetKcal(String(result.kcal));
    setTargetProtein(String(result.protein));
    setTargetFat(String(result.fat));
    setTargetCarbs(String(result.carbs));
  }, [gender, height, weight, activity, kbjuManual]);'''
assert old_effect in content
content = content.replace(old_effect, new_effect)

# g) include kbjuManual in handleSave body
old_body = '''      if (targetCarbs) body.targetCarbs = Number(targetCarbs);

      const res = await apiRequest("PUT", "/api/user/profile", body);'''
new_body = '''      if (targetCarbs) body.targetCarbs = Number(targetCarbs);
      body.kbjuManual = kbjuManual;

      const res = await apiRequest("PUT", "/api/user/profile", body);'''
assert old_body in content
content = content.replace(old_body, new_body)

# d) + e) + f) replace the КБЖУ section header and inputs
old_section = '''            {/* Целевые КБЖУ */}
            <div>
              <Label className="text-xs mb-2 block">Целевые КБЖУ (автозаполнение или вручную)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Ккал</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="2000"
                    value={targetKcal}
                    onChange={(e) => setTargetKcal(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Белки, г</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="120"
                    value={targetProtein}
                    onChange={(e) => setTargetProtein(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Жиры, г</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="70"
                    value={targetFat}
                    onChange={(e) => setTargetFat(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Углеводы, г</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="200"
                    value={targetCarbs}
                    onChange={(e) => setTargetCarbs(e.target.value)}
                  />
                </div>
              </div>
            </div>'''

new_section = '''            {/* Целевые КБЖУ */}
            <div>
              {/* UX-20: mode badge */}
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs mb-0 block">Целевые КБЖУ</Label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${kbjuManual ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800" : "bg-muted text-muted-foreground border-border"}`}
                    title={kbjuManual ? "Нажмите «Рассчитать по формуле» для обновления автоматически" : "Значения рассчитаны автоматически по формуле Миффлина"}>
                    {kbjuManual ? "\u270f\ufe0f Задано вручную" : "\U0001f522 Авторасчёт"}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs px-2"
                    disabled={!height || !weight || gender === "unspecified"}
                    onClick={() => {
                      const h = parseFloat(height);
                      const w = parseFloat(weight);
                      if (!h || !w) return;
                      const result = calcKbzhu(gender, h, w, activity);
                      if (!result) return;
                      setTargetKcal(String(result.kcal));
                      setTargetProtein(String(result.protein));
                      setTargetFat(String(result.fat));
                      setTargetCarbs(String(result.carbs));
                      setKbjuManual(false);
                    }}
                  >
                    Рассчитать по формуле
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Ккал</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="2000"
                    value={targetKcal}
                    onChange={(e) => { setTargetKcal(e.target.value); setKbjuManual(true); }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Белки, г</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="120"
                    value={targetProtein}
                    onChange={(e) => { setTargetProtein(e.target.value); setKbjuManual(true); }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Жиры, г</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="70"
                    value={targetFat}
                    onChange={(e) => { setTargetFat(e.target.value); setKbjuManual(true); }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Углеводы, г</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="200"
                    value={targetCarbs}
                    onChange={(e) => { setTargetCarbs(e.target.value); setKbjuManual(true); }}
                  />
                </div>
              </div>
            </div>'''

assert old_section in content
content = content.replace(old_section, new_section)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("patched ProfileQuestionnaire.tsx")
