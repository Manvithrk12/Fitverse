export type XpEventType =
  | "WORKOUT_COMPLETED"
  | "PROTEIN_GOAL_ACHIEVED"
  | "WATER_GOAL_ACHIEVED"
  | "CHALLENGE_COMPLETED"
  | "PERSONAL_RECORD";

export interface XpTransaction {
  id: string;
  userId: string;
  amount: number;
  eventType: XpEventType;
  referenceId: string | null;
  createdAt: string;
}

export interface GamificationState {
  totalXp: number;
  level: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  /** 0..1 */
  xpProgress: number;
  recentTransactions: XpTransaction[];
}
