import { Request, Response } from "express";
import * as profileService from "../services/profile.service";
import { sendSuccess } from "../utils/apiResponse";

export async function getProfile(req: Request, res: Response): Promise<void> {
  const profile = await profileService.getMyProfile(req.user!.id);
  sendSuccess(res, profile);
}

export async function putProfile(req: Request, res: Response): Promise<void> {
  const profile = await profileService.upsertMyProfile(req.user!.id, req.body);
  sendSuccess(res, profile);
}
