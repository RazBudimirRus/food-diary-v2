import { storage } from "../storage";
import type { InsertDoctorPlan } from "@shared/schema";

export class DoctorRepository {
  getDoctorByUserId(userId: number) {
    return storage.getDoctorByUserId(userId);
  }
  upsertDoctor(userId: number, data: Parameters<typeof storage.upsertDoctor>[1]) {
    return storage.upsertDoctor(userId, data);
  }
  getDoctorPatients(doctorId: number) {
    return storage.getDoctorPatients(doctorId);
  }
  assignPatient(doctorId: number, patientId: number) {
    return storage.assignPatient(doctorId, patientId);
  }
  removePatient(doctorId: number, patientId: number) {
    return storage.removePatient(doctorId, patientId);
  }
  getPatientDoctor(patientId: number) {
    return storage.getPatientDoctor(patientId);
  }
  addDoctorMealNote(data: Parameters<typeof storage.addDoctorMealNote>[0]) {
    return storage.addDoctorMealNote(data);
  }
  getDoctorMealNotes(mealId: number) {
    return storage.getDoctorMealNotes(mealId);
  }
  createDoctorPlan(doctorId: number, data: InsertDoctorPlan) {
    return storage.createDoctorPlan(doctorId, data);
  }
  getDoctorPlansForPatient(patientId: number) {
    return storage.getDoctorPlansForPatient(patientId);
  }
  deleteDoctorPlan(planId: number) {
    return storage.deleteDoctorPlan(planId);
  }
  getActivePlan(patientId: number, date: string) {
    return storage.getActivePlan(patientId, date);
  }
}

export const doctorRepository = new DoctorRepository();
