export interface Meal {
  id: number;
  mealType: string;
  tsStart: string;
  tsEnd?: string;
  foodText?: string;
  drinkText?: string;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  contextNote?: string;
}

export interface Patient {
  user: { id: number; username: string; displayName?: string; email: string };
  assignedAt: string;
}

export interface AuditLogEntry {
  id: number;
  actorId: number;
  actorRole: "user" | "doctor" | "admin";
  action: string;
  targetId: number | null;
  detail: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export type DoctorTab = "patients" | "diary" | "history";
