import { NextFunction, Request, Response } from "express";
import { sendError } from "../utils/apiResponse";

export class AppError extends Error {
  statusCode: number;
  code: string;
  details: unknown[];

  constructor(code: string, message: string, statusCode = 400, details: unknown[] = []) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// 404 handler — placed after all routes.
export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, "NOT_FOUND", `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

// Central error handler — must be registered last with 4 args so Express
// recognizes it as an error middleware.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof AppError) {
    sendError(res, err.code, err.message, err.statusCode, err.details);
    return;
  }

  const message = err instanceof Error ? err.message : "Unexpected error";
  // eslint-disable-next-line no-console
  console.error("[UNHANDLED_ERROR]", err);
  sendError(res, "INTERNAL_SERVER_ERROR", message, 500);
}
