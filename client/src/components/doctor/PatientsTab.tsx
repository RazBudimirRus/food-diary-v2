import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiCall } from "./doctorUtils";
import type { Patient, DoctorTab } from "./types";

interface PatientsTabProps {
  selectedPatient: Patient | null;
  setSelectedPatient: (patient: Patient | null) => void;
  setTab: (tab: DoctorTab) => void;
}

export function PatientsTab({ selectedPatient, setSelectedPatient, setTab }: PatientsTabProps) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: patientsData, isLoading: patientsLoading } = useQuery<{ patients: Patient[] }>({
    queryKey: ["/api/doctor/patients"],
  });
  const patients = patientsData?.patients ?? [];

  const [assignQuery, setAssignQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: number; username: string; displayName?: string }[]>([]);
  const [searchDone, setSearchDone] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  const searchUser = async () => {
    setSearchError(null);
    setAssignError(null);
    const q = assignQuery.trim();
    if (q.length < 2) {
      setSearchError("Введите минимум 2 символа для поиска");
      return;
    }
    try {
      const r = await apiCall(`/api/doctor/search-users?q=${encodeURIComponent(q)}`);
      setSearchResults(r.users ?? []);
      setSearchDone(true);
      if ((r.users ?? []).length === 0) {
        setSearchError("Пользователи не найдены. Проверьте имя пользователя или отображаемое имя.");
      }
    } catch (e: any) {
      setSearchError(e.message || "Ошибка поиска. Попробуйте ещё раз.");
    }
  };

  const assign = useMutation({
    mutationFn: (patientId: number) => apiCall(`/api/doctor/patients/${patientId}/assign`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/doctor/patients"] });
      setAssignQuery("");
      setSearchDone(false);
      setSearchResults([]);
      setAssignError(null);
      toast({ title: "Пациент привязан" });
    },
    onError: (e: Error) => setAssignError(e.message),
  });

  const removePatient = useMutation({
    mutationFn: (patientId: number) => apiCall(`/api/doctor/patients/${patientId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/doctor/patients"] });
      if (selectedPatient) setSelectedPatient(null);
      toast({ title: "Пациент откреплён" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      {/* Assign new patient */}
      <Card>
        <CardContent className="px-4 py-3 space-y-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Привязать пациента
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Имя пользователя или отображаемое имя"
              value={assignQuery}
              onChange={(e) => {
                setAssignQuery(e.target.value);
                setSearchDone(false);
                setSearchError(null);
                setAssignError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && searchUser()}
              className="h-9 text-sm"
            />
            <Button size="sm" variant="outline" onClick={searchUser} className="shrink-0">
              Найти
            </Button>
          </div>
          {searchError && <p className="text-sm text-destructive">{searchError}</p>}
          {assignError && <p className="text-sm text-destructive">{assignError}</p>}
          {searchDone && searchResults.length > 0 && (
            <div className="space-y-1">
              {searchResults.map((u) => (
                <div key={u.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                  <span className="text-sm">
                    {u.displayName || u.username} <span className="text-muted-foreground text-xs">@{u.username}</span>
                  </span>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => assign.mutate(u.id)}
                    disabled={assign.isPending}
                  >
                    {assign.isPending ? "..." : "Привязать"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patient list */}
      <div className="space-y-2">
        {patientsLoading && <p className="text-sm text-muted-foreground text-center py-4">Загрузка...</p>}
        {!patientsLoading && patients.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Нет привязанных пациентов</p>
        )}
        {patients.map((p) => (
          <Card key={p.user.id} className="cursor-pointer hover:shadow-sm transition-shadow">
            <CardContent className="px-4 py-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{p.user.displayName || p.user.username}</p>
                <p className="text-xs text-muted-foreground">@{p.user.username}</p>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => {
                    setSelectedPatient(p);
                    setTab("diary");
                  }}
                >
                  <BookOpen className="h-3.5 w-3.5 mr-1" /> Дневник
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removePatient.mutate(p.user.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
