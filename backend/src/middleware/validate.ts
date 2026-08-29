import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";
import { AppError } from "./errorHandler";

export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      next(new AppError("VALIDATION_ERROR", "Request body failed validation", 400, details));
      return;
    }
    req.body = result.data;
    next();
  };
}
