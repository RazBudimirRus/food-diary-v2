import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, Flame, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiCall } from "./doctorUtils";
import type { Meal, Patient } from "./types";

interface PatientDiaryTabProps {
  selectedPatient: Patient | null;
  setSelectedPatient: (patient: Patient | null) => void;
  diaryDate: string;
  setDiaryDate: (date: string) => void;
  notifyTitle: string;
  setNotifyTitle: (title: string) => void;
  notifyBody: string;
  setNotifyBody: (body: string) => void;
}

export function PatientDiaryTab({
  selectedPatient,
  setSelectedPatient,
  diaryDate,
  setDiaryDate,
  notifyTitle,
  setNotifyTitle,
  notifyBody,
  setNotifyBody,
}: PatientDiaryTabProps) {
  const { toast } = useToast();

  const { data: patientsData } = useQuery<{ patients: Patient[] }>({
    queryKey: ["/api/doctor/patients"],
  });
  const patients = patientsData?.patients ?? [];

  const { data: diaryData, isLoading: diaryLoading } = useQuery<{ day: any; meals: Meal[] }>({
    queryKey: ["/api/doctor/patients", selectedPatient?.user.id, "diary", diaryDate],
    queryFn: () => apiCall(`/api/doctor/patients/${selectedPatient!.user.id}/diary?date=${diaryDate}`),
    enabled: !!selectedPatient,
  });

  const notify = useMutation({
    mutationFn: (patientId: number) =>
      apiCall(`/api/doctor/patients/${patientId}/notify`, {
        method: "POST",
        body: JSON.stringify({ title: notifyTitle, body: notifyBody }),
      }),
    onSuccess: (d) => toast({ title: `Отправлено: ${d.sent} уведомлений` }),
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-3">
      {/* Patient selector */}
      <div className="flex gap-2 items-center">
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          value={selectedPatient?.user.id ?? ""}
          onChange={(e) => {
            const id = Number(e.target.value);
            const p = patients.find((pt) => pt.user.id === id) ?? null;
            setSelectedPatient(p);
          }}
        >
          <option value="">— Выберите пациента —</option>
          {patients.map((p) => (
            <option key={p.user.id} value={p.user.id}>
              {p.user.displayName || p.user.username}
            </option>
          ))}
        </select>
        <Input
          type="date"
          className="h-9 w-36 shrink-0 text-sm"
          value={diaryDate}
          onChange={(e) => setDiaryDate(e.target.value)}
        />
      </div>

      {selectedPatient && (
        <>
          {diaryLoading && <p className="text-sm text-muted-foreground text-center py-6">Загрузка...</p>}
          {!diaryLoading && !diaryData?.meals?.length && (
            <p className="text-sm text-muted-foreground text-center py-6">Нет записей за этот день</p>
          )}
          {diaryData?.meals?.map((meal) => (
            <Card key={meal.id}>
              <CardContent className="px-4 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {meal.tsEnd && meal.tsEnd !== meal.tsStart ? `${meal.tsStart}–${meal.tsEnd}` : meal.tsStart}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {meal.mealType}
                  </Badge>
                </div>
                {meal.foodText && <p className="text-sm mt-1.5">🍽 {meal.foodText}</p>}
                {meal.drinkText && <p className="text-sm mt-0.5">💧 {meal.drinkText}</p>}
                {meal.calories != null && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 rounded-md px-2 py-1 w-fit">
                    <Flame className="h-3 w-3" />
                    <span>{Math.round(meal.calories)} ккал</span>
                    {meal.protein != null && <span>· Б {meal.protein?.toFixed(1)}</span>}
                    {meal.fat != null && <span>· Ж {meal.fat?.toFixed(1)}</span>}
                    {meal.carbs != null && <span>· У {meal.carbs?.toFixed(1)}</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Notify block */}
          <Card>
            <CardContent className="px-4 py-3 space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Bell className="h-4 w-4" /> Уведомление пациенту
              </p>
              <Input
                placeholder="Заголовок"
                value={notifyTitle}
                onChange={(e) => setNotifyTitle(e.target.value)}
                className="h-9 text-sm"
              />
              <Textarea
                placeholder="Текст (необязательно)"
                value={notifyBody}
                onChange={(e) => setNotifyBody(e.target.value)}
                className="text-sm resize-none"
                rows={2}
              />
              <Button
                size="sm"
                disabled={!notifyTitle || notify.isPending}
                onClick={() => notify.mutate(selectedPatient.user.id)}
              >
                {notify.isPending ? "Отправка..." : "Отправить"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
