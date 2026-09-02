export type FitnessGoal =
  | "MUSCLE_GAIN"
  | "FAT_LOSS"
  | "WEIGHT_MAINTENANCE"
  | "STRENGTH"
  | "ENDURANCE"
  | "GENERAL_FITNESS";

export type ActivityLevel =
  | "SEDENTARY"
  | "LIGHTLY_ACTIVE"
  | "MODERATELY_ACTIVE"
  | "VERY_ACTIVE"
  | "EXTREMELY_ACTIVE";

export type DietaryPreference =
  | "NONE"
  | "VEGETARIAN"
  | "VEGAN"
  | "PESCATARIAN"
  | "KETO"
  | "PALEO"
  | "GLUTEN_FREE"
  | "HALAL"
  | "KOSHER";

export type WorkoutType =
  | "STRENGTH_TRAINING"
  | "CARDIO"
  | "HIIT"
  | "YOGA"
  | "PILATES"
  | "CROSSFIT"
  | "CALISTHENICS"
  | "MIXED";

export interface Profile {
  id: string;
  userId: string;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
  fitnessGoal: FitnessGoal | null;
  activityLevel: ActivityLevel | null;
  workoutFrequency: number | null;
  availableEquipment: string[];
  dietaryPreference: DietaryPreference | null;
  preferredWorkoutType: WorkoutType | null;
  createdAt: string;
  updatedAt: string;
}

export const FITNESS_GOAL_OPTIONS: { value: FitnessGoal; label: string }[] = [
  { value: "MUSCLE_GAIN", label: "Muscle Gain" },
  { value: "FAT_LOSS", label: "Fat Loss" },
  { value: "WEIGHT_MAINTENANCE", label: "Weight Maintenance" },
  { value: "STRENGTH", label: "Strength" },
  { value: "ENDURANCE", label: "Endurance" },
  { value: "GENERAL_FITNESS", label: "General Fitness" },
];

export const ACTIVITY_LEVEL_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: "SEDENTARY", label: "Sedentary" },
  { value: "LIGHTLY_ACTIVE", label: "Lightly Active" },
  { value: "MODERATELY_ACTIVE", label: "Moderately Active" },
  { value: "VERY_ACTIVE", label: "Very Active" },
  { value: "EXTREMELY_ACTIVE", label: "Extremely Active" },
];

export const DIETARY_PREFERENCE_OPTIONS: { value: DietaryPreference; label: string }[] = [
  { value: "NONE", label: "No preference" },
  { value: "VEGETARIAN", label: "Vegetarian" },
  { value: "VEGAN", label: "Vegan" },
  { value: "PESCATARIAN", label: "Pescatarian" },
  { value: "KETO", label: "Keto" },
  { value: "PALEO", label: "Paleo" },
  { value: "GLUTEN_FREE", label: "Gluten-Free" },
  { value: "HALAL", label: "Halal" },
  { value: "KOSHER", label: "Kosher" },
];

export const WORKOUT_TYPE_OPTIONS: { value: WorkoutType; label: string }[] = [
  { value: "STRENGTH_TRAINING", label: "Strength Training" },
  { value: "CARDIO", label: "Cardio" },
  { value: "HIIT", label: "HIIT" },
  { value: "YOGA", label: "Yoga" },
  { value: "PILATES", label: "Pilates" },
  { value: "CROSSFIT", label: "CrossFit" },
  { value: "CALISTHENICS", label: "Calisthenics" },
  { value: "MIXED", label: "Mixed / Varied" },
];
