import { AppError } from "../middleware/errorHandler";
import * as progressRepo from "../repositories/progress.repository";
import type { ProgressEntryInput } from "../validators/progress.validators";

function progressNotFound(): never {
  throw new AppError("PROGRESS_NOT_FOUND", "Progress entry not found", 404);
}

function photoNotFound(): never {
  throw new AppError("PROGRESS_PHOTO_NOT_FOUND", "Progress photo not found", 404);
}

export function listMyProgress(userId: string) {
  return progressRepo.listProgressForUser(userId);
}

export async function getMyProgress(userId: string, id: string) {
  const entry = await progressRepo.findOwnedProgress(id, userId);
  if (!entry) progressNotFound();
  return entry;
}

export function createMyProgress(userId: string, input: ProgressEntryInput) {
  return progressRepo.createProgress(userId, input);
}

export async function updateMyProgress(userId: string, id: string, input: ProgressEntryInput) {
  const entry = await progressRepo.updateOwnedProgress(id, userId, input);
  if (!entry) progressNotFound();
  return entry;
}

export async function deleteMyProgress(userId: string, id: string): Promise<void> {
  const deleted = await progressRepo.deleteOwnedProgress(id, userId);
  if (!deleted) progressNotFound();
}

export async function listMyProgressPhotos(userId: string, progressId: string) {
  // Confirms the parent exists and is owned before listing its photos —
  // accessing a sub-resource of a nonexistent/inaccessible parent should
  // 404, not silently return an empty array.
  const parent = await progressRepo.findOwnedProgressShallow(progressId, userId);
  if (!parent) progressNotFound();
  return progressRepo.listPhotosForOwnedProgress(progressId, userId);
}

export async function addMyProgressPhoto(userId: string, progressId: string, url: string) {
  const parent = await progressRepo.findOwnedProgressShallow(progressId, userId);
  if (!parent) progressNotFound();
  return progressRepo.createPhotoForOwnedProgress(progressId, url);
}

export async function deleteMyProgressPhoto(
  userId: string,
  progressId: string,
  photoId: string
): Promise<void> {
  const deleted = await progressRepo.deleteOwnedPhoto(photoId, progressId, userId);
  if (!deleted) photoNotFound();
}
