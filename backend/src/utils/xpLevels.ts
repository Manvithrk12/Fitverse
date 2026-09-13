// Level progression formula — the single place this is defined, so it can
// be tuned later without touching the XP engine itself.
//
// Level 1 starts at 0 XP. Each successive level requires 100 XP more than
// the previous level's requirement did (triangular-number growth), so
// leveling deterministically slows down over time without hardcoding
// individual thresholds:
//   Level 1 ->     0 XP
//   Level 2 ->   100 XP  (+100)
//   Level 3 ->   300 XP  (+200)
//   Level 4 ->   600 XP  (+300)
//   Level 5 -> 1,000 XP  (+400)
const XP_STEP = 100;

// Defensive cap — prevents an unbounded loop for a pathological/corrupt
// totalXp value; no real user is ever expected to approach this.
const MAX_LEVEL_SEARCH = 10_000;

// XP total required to REACH a given level.
export function xpThresholdForLevel(level: number): number {
  if (level <= 1) return 0;
  const n = level - 1;
  return (XP_STEP * n * (n + 1)) / 2;
}

export function calculateLevel(totalXp: number): number {
  if (!Number.isFinite(totalXp) || totalXp < 0) return 1;
  let level = 1;
  while (level < MAX_LEVEL_SEARCH && xpThresholdForLevel(level + 1) <= totalXp) {
    level++;
  }
  return level;
}

export interface LevelProgress {
  level: number;
  totalXp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  /** 0..1 — how far through the current level the user is. */
  xpProgress: number;
}

export function getLevelProgress(totalXp: number): LevelProgress {
  const safeXp = Number.isFinite(totalXp) && totalXp >= 0 ? totalXp : 0;
  const level = calculateLevel(safeXp);
  const xpForCurrentLevel = xpThresholdForLevel(level);
  const xpForNextLevel = xpThresholdForLevel(level + 1);
  const span = xpForNextLevel - xpForCurrentLevel;
  const xpProgress = span > 0 ? (safeXp - xpForCurrentLevel) / span : 1;
  return { level, totalXp: safeXp, xpForCurrentLevel, xpForNextLevel, xpProgress };
}
