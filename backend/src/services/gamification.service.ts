import type { Prisma, XpEventType } from "../generated/prisma/client";
import { prisma } from "../config/prisma";
import * as gamificationRepo from "../repositories/gamification.repository";
import { getLevelProgress, calculateLevel } from "../utils/xpLevels";
import { XP_REWARDS } from "../utils/xpRewards";

export interface AwardXpResult {
  xpAwarded: number;
  totalXp: number;
  level: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpProgress: number;
  leveledUp: boolean;
}

// Prisma's unique-constraint violation code. Checked structurally rather
// than importing Prisma's error class, since that import path differs
// slightly across generator configurations and this is the only property
// this function actually needs.
function isUniqueConstraintViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";
}

function buildResult(
  profile: { totalXp: number; level: number },
  xpAwarded: number,
  leveledUp: boolean
): AwardXpResult {
  const { xpForCurrentLevel, xpForNextLevel, xpProgress } = getLevelProgress(profile.totalXp);
  return {
    xpAwarded,
    totalXp: profile.totalXp,
    level: profile.level,
    xpForCurrentLevel,
    xpForNextLevel,
    xpProgress,
    leveledUp,
  };
}

// The XP engine. Every future gamification event (achievements, streaks,
// challenges, personal records) should award XP through this one function
// rather than re-implementing the level math or the idempotency check.
//
// Idempotency: when referenceId is provided, the same (userId, eventType,
// referenceId) can only ever award XP once — checked inside the same DB
// transaction as the award itself, with the schema's unique constraint as
// a race-safe backstop (caught below) if two requests somehow race past
// the initial check at the same instant.
export async function awardXp(
  userId: string,
  eventType: XpEventType,
  referenceId?: string | null
): Promise<AwardXpResult> {
  const amount = XP_REWARDS[eventType];

  try {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (referenceId) {
        const existing = await gamificationRepo.findTransactionByReference(userId, eventType, referenceId, tx);
        if (existing) {
          const profile = await gamificationRepo.getOrCreateProfile(userId, tx);
          return buildResult(profile, 0, false);
        }
      }

      const before = await gamificationRepo.getOrCreateProfile(userId, tx);
      await gamificationRepo.createTransaction(
        { userId, amount, eventType, referenceId: referenceId ?? null },
        tx
      );

      const newTotalXp = before.totalXp + amount;
      const newLevel = calculateLevel(newTotalXp);
      const leveledUp = newLevel > before.level;

      const updated = await gamificationRepo.updateProfileXp(userId, newTotalXp, newLevel, tx);
      return buildResult(updated, amount, leveledUp);
    });
  } catch (err) {
    if (isUniqueConstraintViolation(err)) {
      // Lost a race to award the exact same event twice — by the time we
      // get here, the winning request has already committed, so this is a
      // safe idempotent no-op rather than an error.
      const profile = await gamificationRepo.getOrCreateProfile(userId);
      return buildResult(profile, 0, false);
    }
    throw err;
  }
}

export function awardWorkoutCompletedXp(userId: string, workoutId: string): Promise<AwardXpResult> {
  return awardXp(userId, "WORKOUT_COMPLETED", workoutId);
}

export async function getMyGamificationState(userId: string, historyLimit = 10) {
  const profile = await gamificationRepo.getOrCreateProfile(userId);
  const recentTransactions = await gamificationRepo.listRecentTransactions(userId, historyLimit);
  const { xpForCurrentLevel, xpForNextLevel, xpProgress } = getLevelProgress(profile.totalXp);
  return {
    totalXp: profile.totalXp,
    level: profile.level,
    xpForCurrentLevel,
    xpForNextLevel,
    xpProgress,
    recentTransactions,
  };
}

export function getMyXpHistory(userId: string, limit = 50) {
  return gamificationRepo.listRecentTransactions(userId, limit);
}
