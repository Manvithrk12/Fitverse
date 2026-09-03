import { Request, Response } from "express";
import * as nutritionService from "../services/nutrition.service";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess } from "../utils/apiResponse";
import { dateQuerySchema } from "../validators/nutrition.validators";

// Express 5 types route params as `string | string[]`; :id is always a
// single string in practice for these routes (same reasoning as the
// workout controller's paramId helper).
function paramId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? id[0] : id;
}

export async function listNutrition(req: Request, res: Response): Promise<void> {
  const dateParam = req.query.date;

  if (typeof dateParam === "string" && dateParam.length > 0) {
    const parsed = dateQuerySchema.safeParse(dateParam);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid date query parameter",
        400,
        parsed.error.issues.map((i) => ({ path: "date", message: i.message }))
      );
    }
    const result = await nutritionService.getMyEntriesForDate(req.user!.id, parsed.data);
    sendSuccess(res, result);
    return;
  }

  const entries = await nutritionService.listMyEntries(req.user!.id);
  sendSuccess(res, entries);
}

export async function createNutrition(req: Request, res: Response): Promise<void> {
  const entry = await nutritionService.createMyEntry(req.user!.id, req.body);
  sendSuccess(res, entry, 201);
}

export async function getNutrition(req: Request, res: Response): Promise<void> {
  const entry = await nutritionService.getMyEntry(req.user!.id, paramId(req));
  sendSuccess(res, entry);
}

export async function updateNutrition(req: Request, res: Response): Promise<void> {
  const entry = await nutritionService.updateMyEntry(req.user!.id, paramId(req), req.body);
  sendSuccess(res, entry);
}

export async function deleteNutrition(req: Request, res: Response): Promise<void> {
  await nutritionService.deleteMyEntry(req.user!.id, paramId(req));
  sendSuccess(res, { deleted: true });
}
