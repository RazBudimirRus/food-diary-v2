import { storage } from "../storage";
import type { DaySummary } from "@shared/schema";

export class DayRepository {
  getDayById(id: number) {
    return storage.getDayById(id);
  }
  getDayByDate(userId: number, date: string) {
    return storage.getDayByDate(userId, date);
  }
  getDaysInRange(userId: number, startDate: string, endDate: string) {
    return storage.getDaysInRange(userId, startDate, endDate);
  }
  getOrCreateDay(userId: number, date: string) {
    return storage.getOrCreateDay(userId, date);
  }
  updateDaySummary(dayId: number, summary: DaySummary) {
    return storage.updateDaySummary(dayId, summary);
  }
}

export const dayRepository = new DayRepository();
