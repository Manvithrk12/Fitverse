export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

export const MEAL_TYPE_OPTIONS: { value: MealType; label: string }[] = [
  { value: "BREAKFAST", label: "Breakfast" },
  { value: "LUNCH", label: "Lunch" },
  { value: "DINNER", label: "Dinner" },
  { value: "SNACK", label: "Snack" },
];

export interface NutritionEntry {
  id: string;
  userId: string;
  foodName: string;
  mealType: MealType;
  servingSize: string;
  calories: number;
  proteinGrams: number | null;
  carbohydratesGrams: number | null;
  fatGrams: number | null;
  consumedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyTotals {
  calories: number;
  proteinGrams: number;
  carbohydratesGrams: number;
  fatGrams: number;
}

export interface NutritionForDate {
  entries: NutritionEntry[];
  totals: DailyTotals;
}
