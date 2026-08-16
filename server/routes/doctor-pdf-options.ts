import { storage } from "../storage";
import type { DoctorPdfOptions } from "../doctor-pdf";

/**
 * Build the shared PDF options for the current user.
 *
 * `patientLabel` = users.displayName?.trim() || users.username (fallback).
 * `targets`      = user_profiles.target{Kcal,Protein,Fat,Carbs}.
 *
 * When there is no profile row at all, targets is null. When profile exists
 * but every field is null/0 (user skipped КБЖУ), targets is also null so the
 * PDF renders a single "Нормы КБЖУ не заданы" callout instead of 4 empty bars.
 */
export function buildDoctorPdfOptions(userId: number): DoctorPdfOptions {
  const user = storage.getUserById(userId);
  const profile = storage.getUserProfile(userId);
  const patientLabel = user ? user.displayName?.trim() || user.username : null;

  if (!profile) return { patientLabel, targets: null };

  const kcal = numOrNull(profile.targetKcal);
  const protein = numOrNull(profile.targetProtein);
  const fat = numOrNull(profile.targetFat);
  const carbs = numOrNull(profile.targetCarbs);

  const allEmpty = kcal == null && protein == null && fat == null && carbs == null;

  return {
    patientLabel,
    targets: allEmpty ? null : { kcal, protein, fat, carbs },
  };
}

function numOrNull(v: number | null | undefined): number | null {
  if (v == null) return null;
  if (!Number.isFinite(v) || v <= 0) return null;
  return v;
}
