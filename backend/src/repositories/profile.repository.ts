import { prisma } from "../config/prisma";
import type { UpsertProfileInput } from "../validators/profile.validators";

export function findProfileByUserId(userId: string) {
  return prisma.profile.findUnique({ where: { userId } });
}

// True full-replace: every field is written explicitly (nullable scalars
// default to null, availableEquipment defaults to []), both on create and
// on update — an omitted field in the input is not "left unchanged".
export function upsertProfileForUser(userId: string, input: UpsertProfileInput) {
  const data = {
    age: input.age ?? null,
    heightCm: input.heightCm ?? null,
    weightKg: input.weightKg ?? null,
    targetWeightKg: input.targetWeightKg ?? null,
    fitnessGoal: input.fitnessGoal ?? null,
    activityLevel: input.activityLevel ?? null,
    workoutFrequency: input.workoutFrequency ?? null,
    availableEquipment: input.availableEquipment ?? [],
    dietaryPreference: input.dietaryPreference ?? null,
    preferredWorkoutType: input.preferredWorkoutType ?? null,
  };

  return prisma.profile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}
