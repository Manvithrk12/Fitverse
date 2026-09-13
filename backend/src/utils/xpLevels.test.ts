import { describe, expect, it } from "vitest";
import { calculateLevel, getLevelProgress, xpThresholdForLevel } from "./xpLevels";

describe("xpThresholdForLevel", () => {
  it("level 1 is 0 XP", () => {
    expect(xpThresholdForLevel(1)).toBe(0);
  });

  it("matches the documented triangular progression", () => {
    expect(xpThresholdForLevel(2)).toBe(100);
    expect(xpThresholdForLevel(3)).toBe(300);
    expect(xpThresholdForLevel(4)).toBe(600);
    expect(xpThresholdForLevel(5)).toBe(1000);
  });
});

describe("calculateLevel — boundary values", () => {
  it("0 XP is level 1", () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it("just below a threshold stays at the lower level", () => {
    expect(calculateLevel(99)).toBe(1);
    expect(calculateLevel(299)).toBe(2);
    expect(calculateLevel(599)).toBe(3);
  });

  it("exactly at a threshold reaches the new level", () => {
    expect(calculateLevel(100)).toBe(2);
    expect(calculateLevel(300)).toBe(3);
    expect(calculateLevel(600)).toBe(4);
    expect(calculateLevel(1000)).toBe(5);
  });

  it("one XP past a threshold stays at the new level", () => {
    expect(calculateLevel(101)).toBe(2);
  });

  it("defends against negative/invalid input", () => {
    expect(calculateLevel(-50)).toBe(1);
    expect(calculateLevel(NaN)).toBe(1);
  });
});

describe("getLevelProgress", () => {
  it("reports 0 progress exactly at a level's starting threshold", () => {
    const p = getLevelProgress(300);
    expect(p.level).toBe(3);
    expect(p.xpForCurrentLevel).toBe(300);
    expect(p.xpForNextLevel).toBe(600);
    expect(p.xpProgress).toBe(0);
  });

  it("reports fractional progress partway through a level", () => {
    // Level 2 spans 100 -> 300 (200 XP wide). 200 XP is halfway.
    const p = getLevelProgress(200);
    expect(p.level).toBe(2);
    expect(p.xpProgress).toBeCloseTo(0.5, 5);
  });

  it("clamps negative XP to a safe zero-progress state instead of throwing", () => {
    const p = getLevelProgress(-10);
    expect(p.level).toBe(1);
    expect(p.totalXp).toBe(0);
    expect(p.xpProgress).toBe(0);
  });
});
