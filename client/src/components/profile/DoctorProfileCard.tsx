import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Stethoscope, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient as qc } from "@/lib/queryClient";
import { profileApi } from "./profileUtils";
import type { Doctor, DoctorForm } from "./types";

export function DoctorProfileCard() {
  const { toast } = useToast();

  const { data: doctorData } = useQuery<{ doctor: Doctor | null }>({
    queryKey: ["/api/doctor/profile"],
    queryFn: () => profileApi("GET", "/api/doctor/profile"),
  });

  const [doctorForm, setDoctorForm] = useState<DoctorForm>({ fullName: "", phone: "", telegramUrl: "" });

  useEffect(() => {
    if (doctorData?.doctor) {
      setDoctorForm({
        fullName: doctorData.doctor.fullName ?? "",
        phone: doctorData.doctor.phone ?? "",
        telegramUrl: doctorData.doctor.telegramUrl ?? "",
      });
    }
  }, [doctorData?.doctor]);

  const saveDoctor = useMutation({
    mutationFn: () => profileApi("PUT", "/api/doctor/profile", doctorForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/doctor/profile"] });
      toast({ title: "Профиль врача сохранён" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          <Stethoscope className="h-4 w-4" /> Профиль врача
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        <p className="text-xs text-muted-foreground">Эти данные видны пациентам в кабинете врача.</p>
        <div className="space-y-1">
          <Label className="text-xs">ФИО врача *</Label>
          <Input
            value={doctorForm.fullName}
            onChange={(e) => setDoctorForm((f) => ({ ...f, fullName: e.target.value }))}
            placeholder="Краснова Мария Ивановна"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Телефон</Label>
          <Input
            value={doctorForm.phone}
            onChange={(e) => setDoctorForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+7 (900) 000-00-00"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Telegram</Label>
          <Input
            value={doctorForm.telegramUrl}
            onChange={(e) => setDoctorForm((f) => ({ ...f, telegramUrl: e.target.value }))}
            placeholder="https://t.me/username"
            className="h-9 text-sm"
          />
        </div>
        <Button
          className="w-full"
          size="sm"
          disabled={!doctorForm.fullName || saveDoctor.isPending}
          onClick={() => saveDoctor.mutate()}
        >
          <Save className="h-4 w-4 mr-2" />
          {saveDoctor.isPending ? "Сохранение..." : "Сохранить профиль врача"}
        </Button>
      </CardContent>
    </Card>
  );
}
