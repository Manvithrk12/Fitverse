import { z } from "zod";

const mealTypes = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;

// Create and update share one schema, same full-replace PUT convention as
// PUT /profiles/me and PUT /workouts/:id: a field omitted from the request
// clears to null (macros only — foodName/mealType/servingSize/calories/
// consumedAt are always required, per the documented decision that macros
// are optional but the core entry fields are not).
export const nutritionEntrySchema = z.object({
  foodName: z.string().trim().min(1, "Food name is required").max(200, "Food name is too long"),
  mealType: z.enum(mealTypes),
  servingSize: z.string().trim().min(1, "Serving size is required").max(100, "Serving size is too long"),
  calories: z.number().int().min(0, "Calories cannot be negative").max(10000, "Calories value is unreasonably high"),
  proteinGrams: z.number().min(0, "Protein cannot be negative").max(2000).nullable().optional(),
  carbohydratesGrams: z.number().min(0, "Carbohydrates cannot be negative").max(2000).nullable().optional(),
  fatGrams: z.number().min(0, "Fat cannot be negative").max(2000).nullable().optional(),
  consumedAt: z.coerce.date({ message: "consumedAt must be a valid date/time" }),
});

export type NutritionEntryInput = z.infer<typeof nutritionEntrySchema>;

// Strict YYYY-MM-DD shape for the ?date= query param — validated
// separately from the body schema since it arrives as a bare string, and
// its exact format matters for the UTC day-boundary math in the service.
export const dateQuerySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format");

export { mealTypes };
