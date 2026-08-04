export interface MeResponse {
  id: number;
  username: string;
  email: string;
  displayName?: string | null;
  role: string;
  createdAt?: string;
  lastLoginAt?: string | null;
}

export interface Doctor {
  id: number;
  fullName: string;
  phone?: string | null;
  telegramUrl?: string | null;
}

export interface MfaStatus {
  mfaEnabled: boolean;
  canEnable: boolean;
}

export interface DoctorForm {
  fullName: string;
  phone: string;
  telegramUrl: string;
}
