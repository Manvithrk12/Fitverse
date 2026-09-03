import { z } from "zod";
import { workoutTypes } from "./profile.validators";

// Create and update share one schema — this API treats PUT as a
// full-replace (same convention as PUT /profiles/me from Step 1): a field
// omitted from the request clears to null, except title, which is always
// required. `status` is deliberately not settable here — the only way to
// move a workout to COMPLETED is PATCH /workouts/:id/complete, so there's
// a single, unambiguous transition path rather than two endpoints that
// could race on the same field.
export const workoutInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120, "Title is too long"),
  workoutType: z.enum(workoutTypes).nullable().optional(),
  description: z.string().trim().max(2000, "Description is too long").nullable().optional(),
  scheduledDate: z.coerce.date().nullable().optional(),
  durationMinutes: z
    .number()
    .int()
    .min(1, "Duration must be at least 1 minute")
    .max(600, "Duration must be at most 600 minutes")
    .nullable()
    .optional(),
});

export type WorkoutInput = z.infer<typeof workoutInputSchema>;
