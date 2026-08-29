import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { AppError } from "../middleware/errorHandler";
import { sendSuccess } from "../utils/apiResponse";
import { clearRefreshTokenCookie, REFRESH_COOKIE_NAME, setRefreshTokenCookie } from "../utils/cookies";

export async function postRegister(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  const result = await authService.register(email, password);
  setRefreshTokenCookie(res, result.refreshToken);
  sendSuccess(res, { user: result.user, accessToken: result.accessToken }, 201);
}

export async function postLogin(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  setRefreshTokenCookie(res, result.refreshToken);
  sendSuccess(res, { user: result.user, accessToken: result.accessToken });
}

export async function postRefresh(req: Request, res: Response): Promise<void> {
  const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!rawRefreshToken) {
    throw new AppError("UNAUTHORIZED", "Missing refresh token", 401);
  }
  const result = await authService.refresh(rawRefreshToken);
  setRefreshTokenCookie(res, result.refreshToken);
  sendSuccess(res, { user: result.user, accessToken: result.accessToken });
}

export async function postLogout(req: Request, res: Response): Promise<void> {
  const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  await authService.logout(rawRefreshToken);
  clearRefreshTokenCookie(res);
  sendSuccess(res, { loggedOut: true });
}
