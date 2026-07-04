import { storage } from "../storage";
import type { InsertMeal } from "@shared/schema";

export class MealRepository {
  getMealsByDay(dayId: number) {
    return storage.getMealsByDay(dayId);
  }
  addMeal(data: InsertMeal) {
    return storage.addMeal(data);
  }
  updateMeal(id: number, data: Partial<InsertMeal>) {
    return storage.updateMeal(id, data);
  }
  deleteMeal(id: number) {
    return storage.deleteMeal(id);
  }
  getMeal(id: number) {
    return storage.getMeal(id);
  }
}

export const mealRepository = new MealRepository();
