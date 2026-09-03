import { AppError } from "../middleware/errorHandler";
import * as nutritionRepo from "../repositories/nutrition.repository";
import type { NutritionEntryInput } from "../validators/nutrition.validators";

function notFound(): never {
  // Same code/message whether the entry doesn't exist or belongs to
  // someone else — distinguishing the two would leak which ids exist.
  throw new AppError("NUTRITION_ENTRY_NOT_FOUND", "Nutrition entry not found", 404);
}

// UTC calendar-day boundary: [00:00:00.000Z, +24h). The blueprint doesn't
// specify per-user timezone handling, and consumedAt is already stored as
// UTC, so this is the smallest reasonable, internally-consistent choice —
// not a claim that it matches every user's local calendar day.
function utcDayRange(dateStr: string): { start: Date; end: Date } {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    throw new AppError("VALIDATION_ERROR", "Invalid date query parameter", 400);
  }
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function listMyEntries(userId: string) {
  return nutritionRepo.listEntriesForUser(userId);
}

export async function getMyEntry(userId: string, id: string) {
  const entry = await nutritionRepo.findOwnedEntry(id, userId);
  if (!entry) notFound();
  return entry;
}

export function createMyEntry(userId: string, input: NutritionEntryInput) {
  return nutritionRepo.createEntry(userId, input);
}

export async function updateMyEntry(userId: string, id: string, input: NutritionEntryInput) {
  const entry = await nutritionRepo.updateOwnedEntry(id, userId, input);
  if (!entry) notFound();
  return entry;
}

export async function deleteMyEntry(userId: string, id: string): Promise<void> {
  const deleted = await nutritionRepo.deleteOwnedEntry(id, userId);
  if (!deleted) notFound();
}

// Combined "entries + totals" response for ?date=YYYY-MM-DD, as suggested
// by the spec — one endpoint instead of a separate totals endpoint.
export async function getMyEntriesForDate(userId: string, dateStr: string) {
  const range = utcDayRange(dateStr);

  const [entries, sums] = await Promise.all([
    nutritionRepo.listEntriesForUser(userId, range),
    nutritionRepo.getDailyTotals(userId, range),
  ]);

  return {
    entries,
    totals: {
      calories: sums._sum.calories ?? 0,
      proteinGrams: sums._sum.proteinGrams ? sums._sum.proteinGrams.toNumber() : 0,
      carbohydratesGrams: sums._sum.carbohydratesGrams ? sums._sum.carbohydratesGrams.toNumber() : 0,
      fatGrams: sums._sum.fatGrams ? sums._sum.fatGrams.toNumber() : 0,
    },
  };
}
