import { AppError } from "../middleware/errorHandler";
import * as workoutRepo from "../repositories/workout.repository";
import type { WorkoutInput } from "../validators/workout.validators";

function notFound(): never {
  // Same message/code whether the workout doesn't exist at all or belongs
  // to someone else — distinguishing the two would leak which ids exist.
  throw new AppError("WORKOUT_NOT_FOUND", "Workout not found", 404);
}

export function listMyWorkouts(userId: string) {
  return workoutRepo.listWorkoutsForUser(userId);
}

export function createMyWorkout(userId: string, input: WorkoutInput) {
  return workoutRepo.createWorkout(userId, input);
}

export async function getMyWorkout(userId: string, id: string) {
  const workout = await workoutRepo.findOwnedWorkout(id, userId);
  if (!workout) notFound();
  return workout;
}

export async function updateMyWorkout(userId: string, id: string, input: WorkoutInput) {
  const workout = await workoutRepo.updateOwnedWorkout(id, userId, input);
  if (!workout) notFound();
  return workout;
}

export async function deleteMyWorkout(userId: string, id: string): Promise<void> {
  const deleted = await workoutRepo.deleteOwnedWorkout(id, userId);
  if (!deleted) notFound();
}

export async function completeMyWorkout(userId: string, id: string) {
  const workout = await workoutRepo.completeOwnedWorkout(id, userId);
  if (!workout) notFound();
  return workout;
}
