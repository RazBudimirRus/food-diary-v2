export interface CatalogEntry {
  id: number;
  mealName: string;
  grams?: number | null;
  kcal?: number | null;
  protein?: number | null;
  fat?: number | null;
  carbs?: number | null;
}

export interface CatalogItem {
  id: number;
  name: string;
  description?: string | null;
  isSet: boolean;
  createdAt: string;
  entries: CatalogEntry[];
}

export interface ProductForm {
  name: string;
  description: string;
  grams: string;
  kcal: string;
  protein: string;
  fat: string;
  carbs: string;
}

export const emptyForm = (): ProductForm => ({
  name: "",
  description: "",
  grams: "",
  kcal: "",
  protein: "",
  fat: "",
  carbs: "",
});
