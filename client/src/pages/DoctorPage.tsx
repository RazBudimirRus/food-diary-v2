/**
 * DoctorPage — Фаза 15.
 * Кабинет врача: профиль, список пациентов, просмотр дневника пациента.
 */
import { useState } from "react";
import { Stethoscope, ChevronLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";
import { useLocation } from "wouter";
import { PatientsTab, PatientDiaryTab, DoctorHistoryTab } from "@/components/doctor";
import type { Patient, DoctorTab } from "@/components/doctor";

export default function DoctorPage() {
  const { user } = useAuth();
  const [location] = useLocation();

  const [tab, setTab] = useState<DoctorTab>("patients");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [diaryDate, setDiaryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyBody, setNotifyBody] = useState("");

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card/90 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <a
              href="#/"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm hidden sm:inline">Дневник</span>
            </a>
            <span className="text-muted-foreground/40 hidden sm:inline">|</span>
            <Stethoscope className="h-4 w-4 text-primary" />
            <h1 className="font-semibold text-base">Кабинет врача</h1>
          </div>
          <a
            href="#/profile"
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Профиль врача
          </a>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex gap-1 mb-4 border rounded-lg p-1 bg-muted/40">
          {(["patients", "diary", "history"] as DoctorTab[]).map((t) => (
            <button
              key={t}
              className={`flex-1 text-xs py-1.5 px-2 rounded-md font-medium transition-colors ${
                tab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setTab(t)}
            >
              {t === "patients" ? "Пациенты" : t === "diary" ? "Дневник" : "История"}
            </button>
          ))}
        </div>

        {tab === "patients" && (
          <PatientsTab selectedPatient={selectedPatient} setSelectedPatient={setSelectedPatient} setTab={setTab} />
        )}
        {tab === "diary" && (
          <PatientDiaryTab
            selectedPatient={selectedPatient}
            setSelectedPatient={setSelectedPatient}
            diaryDate={diaryDate}
            setDiaryDate={setDiaryDate}
            notifyTitle={notifyTitle}
            setNotifyTitle={setNotifyTitle}
            notifyBody={notifyBody}
            setNotifyBody={setNotifyBody}
          />
        )}
        {tab === "history" && <DoctorHistoryTab />}
      </div>

      <BottomNav
        isAdmin={user?.role === "admin"}
        isDoctor={user?.role === "doctor" || user?.role === "admin"}
        currentPath={location}
      />
    </div>
  );
}
