import { NextFunction, Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import * as progressRepo from "../repositories/progress.repository";
import * as progressService from "../services/progress.service";
import { sendSuccess } from "../utils/apiResponse";

// Express 5 types route params as `string | string[]`; a plain named
// segment is always a single string in practice for these routes (same
// reasoning as workout.controller.ts's paramId helper).
function param(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

// Runs before validateBody on routes that both (a) target an existing
// :id and (b) validate a request body. Without this, a cross-user request
// with an invalid body fails validation (400) before the service's
// ownership check ever runs (404) — leaking that the resource exists and
// is reachable. This checks ownership first, independent of the body.
export async function ensureProgressOwnership(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const owned = await progressRepo.findOwnedProgressShallow(param(req, "id"), req.user!.id);
  if (!owned) {
    next(new AppError("PROGRESS_NOT_FOUND", "Progress entry not found", 404));
    return;
  }
  next();
}

export async function listProgress(req: Request, res: Response): Promise<void> {
  const entries = await progressService.listMyProgress(req.user!.id);
  sendSuccess(res, entries);
}

export async function createProgress(req: Request, res: Response): Promise<void> {
  const entry = await progressService.createMyProgress(req.user!.id, req.body);
  sendSuccess(res, entry, 201);
}

export async function getProgress(req: Request, res: Response): Promise<void> {
  const entry = await progressService.getMyProgress(req.user!.id, param(req, "id"));
  sendSuccess(res, entry);
}

export async function updateProgress(req: Request, res: Response): Promise<void> {
  const entry = await progressService.updateMyProgress(req.user!.id, param(req, "id"), req.body);
  sendSuccess(res, entry);
}

export async function deleteProgress(req: Request, res: Response): Promise<void> {
  await progressService.deleteMyProgress(req.user!.id, param(req, "id"));
  sendSuccess(res, { deleted: true });
}

export async function listProgressPhotos(req: Request, res: Response): Promise<void> {
  const photos = await progressService.listMyProgressPhotos(req.user!.id, param(req, "id"));
  sendSuccess(res, photos);
}

export async function addProgressPhoto(req: Request, res: Response): Promise<void> {
  const photo = await progressService.addMyProgressPhoto(req.user!.id, param(req, "id"), req.body.url);
  sendSuccess(res, photo, 201);
}

export async function deleteProgressPhoto(req: Request, res: Response): Promise<void> {
  await progressService.deleteMyProgressPhoto(req.user!.id, param(req, "id"), param(req, "photoId"));
  sendSuccess(res, { deleted: true });
}
