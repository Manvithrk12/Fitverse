import { AppError } from "../middleware/errorHandler";
import { findProfileByUserId, upsertProfileForUser } from "../repositories/profile.repository";
import type { UpsertProfileInput } from "../validators/profile.validators";

export async function getMyProfile(userId: string) {
  const profile = await findProfileByUserId(userId);
  if (!profile) {
    throw new AppError("PROFILE_NOT_FOUND", "No profile has been created yet", 404);
  }
  return profile;
}

export async function upsertMyProfile(userId: string, input: UpsertProfileInput) {
  return upsertProfileForUser(userId, input);
}
