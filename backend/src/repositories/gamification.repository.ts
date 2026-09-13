import type { Prisma, XpEventType } from "../generated/prisma/client";
import { prisma } from "../config/prisma";

// Every function accepts an optional Prisma client so the same repository
// code works both standalone (GET /gamification/me) and inside a
// $transaction (awarding XP) — the transaction client has the same model
// delegate shape as the top-level singleton.
type Db = Prisma.TransactionClient | typeof prisma;

export function getOrCreateProfile(userId: string, db: Db = prisma) {
  return db.gamificationProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export function updateProfileXp(userId: string, totalXp: number, level: number, db: Db = prisma) {
  return db.gamificationProfile.update({
    where: { userId },
    data: { totalXp, level },
  });
}

export function findTransactionByReference(
  userId: string,
  eventType: XpEventType,
  referenceId: string,
  db: Db = prisma
) {
  return db.xpTransaction.findUnique({
    where: { userId_eventType_referenceId: { userId, eventType, referenceId } },
  });
}

export function createTransaction(
  data: { userId: string; amount: number; eventType: XpEventType; referenceId: string | null },
  db: Db = prisma
) {
  return db.xpTransaction.create({ data });
}

export function listRecentTransactions(userId: string, limit: number) {
  return prisma.xpTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
