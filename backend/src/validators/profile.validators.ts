import { z } from "zod";

const fitnessGoals = [
  "MUSCLE_GAIN",
  "FAT_LOSS",
  "WEIGHT_MAINTENANCE",
  "STRENGTH",
  "ENDURANCE",
  "GENERAL_FITNESS",
] as const;

const activityLevels = [
  "SEDENTARY",
  "LIGHTLY_ACTIVE",
  "MODERATELY_ACTIVE",
  "VERY_ACTIVE",
  "EXTREMELY_ACTIVE",
] as const;

const dietaryPreferences = [
  "NONE",
  "VEGETARIAN",
  "VEGAN",
  "PESCATARIAN",
  "KETO",
  "PALEO",
  "GLUTEN_FREE",
  "HALAL",
  "KOSHER",
] as const;

const workoutTypes = [
  "STRENGTH_TRAINING",
  "CARDIO",
  "HIIT",
  "YOGA",
  "PILATES",
  "CROSSFIT",
  "CALISTHENICS",
  "MIXED",
] as const;

// PUT /profiles/me is a true full-replace upsert: every field is optional,
// and an omitted field is treated as "clear to null" by the service layer
// (see profile.service.ts) — not "leave unchanged".
export const upsertProfileSchema = z.object({
  age: z.number().int().min(13).max(120).nullable().optional(),
  heightCm: z.number().min(50).max(250).nullable().optional(),
  weightKg: z.number().min(20).max(400).nullable().optional(),
  targetWeightKg: z.number().min(20).max(400).nullable().optional(),
  fitnessGoal: z.enum(fitnessGoals).nullable().optional(),
  activityLevel: z.enum(activityLevels).nullable().optional(),
  workoutFrequency: z.number().int().min(0).max(7).nullable().optional(),
  availableEquipment: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  dietaryPreference: z.enum(dietaryPreferences).nullable().optional(),
  preferredWorkoutType: z.enum(workoutTypes).nullable().optional(),
});

export type UpsertProfileInput = z.infer<typeof upsertProfileSchema>;

export { fitnessGoals, activityLevels, dietaryPreferences, workoutTypes };
