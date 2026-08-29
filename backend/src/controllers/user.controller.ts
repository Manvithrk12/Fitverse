import { Request, Response } from "express";
import { findUserById } from "../repositories/user.repository";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess } from "../utils/apiResponse";

export async function getMe(req: Request, res: Response): Promise<void> {
  // req.user is guaranteed by the authenticate middleware that guards this route.
  const user = await findUserById(req.user!.id);
  if (!user) {
    throw new AppError("NOT_FOUND", "User not found", 404);
  }
  sendSuccess(res, { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt });
}
