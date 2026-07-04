import { storage } from "../storage";
import type { CreateCatalogItem } from "@shared/schema";

export class CatalogRepository {
  getCatalogItems(userId: number) {
    return storage.getCatalogItems(userId);
  }
  createCatalogItem(userId: number, data: CreateCatalogItem) {
    return storage.createCatalogItem(userId, data);
  }
  deleteCatalogItem(userId: number, itemId: number) {
    return storage.deleteCatalogItem(userId, itemId);
  }
  saveMealToCatalog(userId: number, mealId: number, name: string) {
    return storage.saveMealToCatalog(userId, mealId, name);
  }
}

export const catalogRepository = new CatalogRepository();
