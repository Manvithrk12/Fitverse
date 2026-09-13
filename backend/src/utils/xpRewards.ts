import type { XpEventType } from "../generated/prisma/client";

// Full reward table per the blueprint. Only WORKOUT_COMPLETED is wired to
// an actual trigger in this step (see workout.controller.ts) — the rest
// exist here so later steps (protein/water goals, challenges, personal
// records) can reuse this same engine without redefining the reward table
// or duplicating the awarding logic.
export const XP_REWARDS: Record<XpEventType, number> = {
  WORKOUT_COMPLETED: 100,
  PROTEIN_GOAL_ACHIEVED: 50,
  WATER_GOAL_ACHIEVED: 25,
  CHALLENGE_COMPLETED: 250,
  PERSONAL_RECORD: 100,
};
