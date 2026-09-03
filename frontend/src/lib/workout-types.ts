import type { WorkoutType } from "./profile-types";

export type WorkoutStatus = "PLANNED" | "COMPLETED";

export interface Workout {
  id: string;
  userId: string;
  title: string;
  workoutType: WorkoutType | null;
  description: string | null;
  scheduledDate: string | null;
  durationMinutes: number | null;
  status: WorkoutStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
