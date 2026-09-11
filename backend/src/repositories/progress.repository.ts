import { prisma } from "../config/prisma";
import type { ProgressEntryInput } from "../validators/progress.validators";

function toWriteData(input: ProgressEntryInput) {
  return {
    recordedAt: input.recordedAt,
    weight: input.weight,
    chest: input.chest ?? null,
    waist: input.waist ?? null,
    hips: input.hips ?? null,
    arms: input.arms ?? null,
    thighs: input.thighs ?? null,
    bodyFatPercent: input.bodyFatPercent ?? null,
  };
}

export function listProgressForUser(userId: string) {
  return prisma.progress.findMany({
    where: { userId },
    orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
  });
}

// Includes photos — the single-entry GET is the "detail" view; the list
// endpoint intentionally stays lightweight and doesn't embed photos.
export function findOwnedProgress(id: string, userId: string) {
  return prisma.progress.findFirst({
    where: { id, userId },
    include: { photos: { orderBy: { createdAt: "desc" } } },
  });
}

// Existence-only check (no photos), used internally by the photo endpoints
// where the photos themselves are the point of the response.
export function findOwnedProgressShallow(id: string, userId: string) {
  return prisma.progress.findFirst({ where: { id, userId } });
}

export function createProgress(userId: string, input: ProgressEntryInput) {
  return prisma.progress.create({ data: { userId, ...toWriteData(input) } });
}

// Ownership enforced in the WHERE clause of the UPDATE/DELETE itself — same
// pattern as workout.repository.ts / nutrition.repository.ts.
export async function updateOwnedProgress(id: string, userId: string, input: ProgressEntryInput) {
  const result = await prisma.progress.updateMany({
    where: { id, userId },
    data: toWriteData(input),
  });
  if (result.count === 0) return null;
  return findOwnedProgress(id, userId);
}

export async function deleteOwnedProgress(id: string, userId: string): Promise<boolean> {
  // ProgressPhoto rows cascade-delete via the schema's onDelete: Cascade.
  const result = await prisma.progress.deleteMany({ where: { id, userId } });
  return result.count > 0;
}

// --- Photos: ownership derived transitively through progress.userId ---

export function listPhotosForOwnedProgress(progressId: string, userId: string) {
  return prisma.progressPhoto.findMany({
    where: { progressId, progress: { userId } },
    orderBy: { createdAt: "desc" },
  });
}

export function createPhotoForOwnedProgress(progressId: string, url: string) {
  // Caller (service) has already verified ownership via
  // findOwnedProgressShallow before calling this — there's no existing
  // photo row to scope a single atomic query by for a create.
  return prisma.progressPhoto.create({ data: { progressId, url } });
}

// Single atomic query: matches only if the photo belongs to this exact
// progress entry AND that progress entry belongs to this exact user —
// no separate existence check needed beforehand.
export async function deleteOwnedPhoto(
  photoId: string,
  progressId: string,
  userId: string
): Promise<boolean> {
  const result = await prisma.progressPhoto.deleteMany({
    where: { id: photoId, progressId, progress: { userId } },
  });
  return result.count > 0;
}
