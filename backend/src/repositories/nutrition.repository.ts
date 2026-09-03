import { prisma } from "../config/prisma";
import type { NutritionEntryInput } from "../validators/nutrition.validators";

function toWriteData(input: NutritionEntryInput) {
  return {
    foodName: input.foodName,
    mealType: input.mealType,
    servingSize: input.servingSize,
    calories: input.calories,
    proteinGrams: input.proteinGrams ?? null,
    carbohydratesGrams: input.carbohydratesGrams ?? null,
    fatGrams: input.fatGrams ?? null,
    consumedAt: input.consumedAt,
  };
}

interface DateRange {
  start: Date;
  end: Date;
}

export function listEntriesForUser(userId: string, range?: DateRange) {
  return prisma.nutritionEntry.findMany({
    where: {
      userId,
      ...(range ? { consumedAt: { gte: range.start, lt: range.end } } : {}),
    },
    orderBy: [{ consumedAt: "desc" }, { createdAt: "desc" }],
  });
}

export function findOwnedEntry(id: string, userId: string) {
  return prisma.nutritionEntry.findFirst({ where: { id, userId } });
}

export function createEntry(userId: string, input: NutritionEntryInput) {
  return prisma.nutritionEntry.create({ data: { userId, ...toWriteData(input) } });
}

// Ownership enforced in the WHERE clause of the UPDATE/DELETE itself — same
// approach as workout.repository.ts.
export async function updateOwnedEntry(id: string, userId: string, input: NutritionEntryInput) {
  const result = await prisma.nutritionEntry.updateMany({
    where: { id, userId },
    data: toWriteData(input),
  });
  if (result.count === 0) return null;
  return prisma.nutritionEntry.findUnique({ where: { id } });
}

export async function deleteOwnedEntry(id: string, userId: string): Promise<boolean> {
  const result = await prisma.nutritionEntry.deleteMany({ where: { id, userId } });
  return result.count > 0;
}

// Summed by Postgres itself (SUM() over DECIMAL/INT columns), not
// accumulated in JS — avoids floating-point accumulation error entirely,
// and is scoped to the same {userId, range} filter as listEntriesForUser,
// so it can never include another user's entries.
export function getDailyTotals(userId: string, range: DateRange) {
  return prisma.nutritionEntry.aggregate({
    where: { userId, consumedAt: { gte: range.start, lt: range.end } },
    _sum: {
      calories: true,
      proteinGrams: true,
      carbohydratesGrams: true,
      fatGrams: true,
    },
  });
}
