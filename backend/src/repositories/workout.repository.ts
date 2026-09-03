import { prisma } from "../config/prisma";
import type { WorkoutInput } from "../validators/workout.validators";

function toWriteData(input: WorkoutInput) {
  return {
    title: input.title,
    workoutType: input.workoutType ?? null,
    description: input.description ?? null,
    scheduledDate: input.scheduledDate ?? null,
    durationMinutes: input.durationMinutes ?? null,
  };
}

export function listWorkoutsForUser(userId: string) {
  return prisma.workout.findMany({
    where: { userId },
    orderBy: [{ scheduledDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  });
}

export function findOwnedWorkout(id: string, userId: string) {
  return prisma.workout.findFirst({ where: { id, userId } });
}

export function createWorkout(userId: string, input: WorkoutInput) {
  return prisma.workout.create({ data: { userId, ...toWriteData(input) } });
}

// Ownership is enforced in the WHERE clause of the UPDATE itself — if the
// row doesn't belong to userId, count is 0 and nothing was ever written.
export async function updateOwnedWorkout(id: string, userId: string, input: WorkoutInput) {
  const result = await prisma.workout.updateMany({
    where: { id, userId },
    data: toWriteData(input),
  });
  if (result.count === 0) return null;
  return prisma.workout.findUnique({ where: { id } });
}

export async function deleteOwnedWorkout(id: string, userId: string): Promise<boolean> {
  const result = await prisma.workout.deleteMany({ where: { id, userId } });
  return result.count > 0;
}

// Idempotent: only flips PLANNED -> COMPLETED (the `status: { not: ... }`
// guard means a workout that's already COMPLETED is left untouched — no
// new completedAt on repeat calls). Returns null if the workout doesn't
// exist or isn't owned by userId; returns the current record either way
// otherwise, whether this call changed it or it was already COMPLETED.
export async function completeOwnedWorkout(id: string, userId: string) {
  await prisma.workout.updateMany({
    where: { id, userId, status: { not: "COMPLETED" } },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  return prisma.workout.findFirst({ where: { id, userId } });
}
