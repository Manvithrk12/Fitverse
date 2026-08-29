import { NextFunction, Request, Response } from "express";
import type { Role } from "../generated/prisma/client";
import { AppError } from "./errorHandler";

export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      // authenticate() should always run first; this guards against
      // authorize() being wired up without it.
      next(new AppError("UNAUTHORIZED", "Not authenticated", 401));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError("FORBIDDEN", "You do not have permission to perform this action", 403));
      return;
    }

    next();
  };
}
