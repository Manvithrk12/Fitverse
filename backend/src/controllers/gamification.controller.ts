import { Request, Response } from "express";
import * as gamificationService from "../services/gamification.service";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess } from "../utils/apiResponse";
import { historyLimitSchema } from "../validators/gamification.validators";

export async function getMyGamification(req: Request, res: Response): Promise<void> {
  const state = await gamificationService.getMyGamificationState(req.user!.id);
  sendSuccess(res, state);
}

export async function getMyGamificationHistory(req: Request, res: Response): Promise<void> {
  const parsed = historyLimitSchema.safeParse(req.query.limit);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid limit query parameter",
      400,
      parsed.error.issues.map((i) => ({ path: "limit", message: i.message }))
    );
  }
  const transactions = await gamificationService.getMyXpHistory(req.user!.id, parsed.data ?? 50);
  sendSuccess(res, transactions);
}
