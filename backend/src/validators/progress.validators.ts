import { z } from "zod";

// Same full-replace PUT convention as Profile/Workout/Nutrition: a
// measurement field omitted from the request clears to null. weight and
// recordedAt are always required.
export const progressEntrySchema = z.object({
  recordedAt: z.coerce.date({ message: "recordedAt must be a valid date/time" }),
  weight: z.number().min(20, "Weight is out of range").max(400, "Weight is out of range"),
  chest: z.number().min(0).max(300).nullable().optional(),
  waist: z.number().min(0).max(300).nullable().optional(),
  hips: z.number().min(0).max(300).nullable().optional(),
  arms: z.number().min(0).max(150).nullable().optional(),
  thighs: z.number().min(0).max(150).nullable().optional(),
  bodyFatPercent: z.number().min(0).max(75).nullable().optional(),
});

export type ProgressEntryInput = z.infer<typeof progressEntrySchema>;

// URL/path only, no binary — matches the schema's ProgressPhoto.url field.
// Kept as a plain trimmed string (not .url()) since a relative local path
// is also a valid MVP value, not just a full URL.
export const progressPhotoSchema = z.object({
  url: z.string().trim().min(1, "Photo URL/path is required").max(2000, "Photo URL/path is too long"),
});

export type ProgressPhotoInput = z.infer<typeof progressPhotoSchema>;
