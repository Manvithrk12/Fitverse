import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { sendError, sendSuccess } from "../utils/apiResponse";

// Liveness check — process is up. Does not touch the database.
export function getLiveness(_req: Request, res: Response): void {
  sendSuccess(res, {
    status: "ok",
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}

// Readiness check — process is up AND the database connection works.
export async function getReadiness(_req: Request, res: Response): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    sendSuccess(res, {
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    sendError(
      res,
      "DATABASE_UNAVAILABLE",
      "Database connection check failed",
      503,
      [error instanceof Error ? error.message : String(error)]
    );
  }
}
