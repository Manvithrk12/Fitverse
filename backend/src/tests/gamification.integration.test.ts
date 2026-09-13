import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../config/prisma";

const app = createApp();

const userAEmail = `phase3-gamification-a-${Date.now()}@fitverse.test`;
const userBEmail = `phase3-gamification-b-${Date.now()}@fitverse.test`;
const password = "correct-horse-battery-staple";

let userAToken: string;
let userBToken: string;

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [userAEmail, userBEmail] } } });
  await prisma.$disconnect();
});

async function createAndCompleteWorkout(token: string, title: string) {
  const created = await request(app)
    .post("/api/v1/workouts")
    .set("Authorization", `Bearer ${token}`)
    .send({ title });
  const workoutId = created.body.data.id;
  return request(app)
    .patch(`/api/v1/workouts/${workoutId}/complete`)
    .set("Authorization", `Bearer ${token}`);
}

describe("Gamification API (integration)", () => {
  it("sets up two authenticated users", async () => {
    const a = await request(app).post("/api/v1/auth/register").send({ email: userAEmail, password });
    const b = await request(app).post("/api/v1/auth/register").send({ email: userBEmail, password });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    userAToken = a.body.data.accessToken;
    userBToken = b.body.data.accessToken;
  });

  it("rejects an unauthenticated GET /gamification/me", async () => {
    const res = await request(app).get("/api/v1/gamification/me");
    expect(res.status).toBe(401);
  });

  it("returns a default level-1, 0-XP state for a brand-new user", async () => {
    const res = await request(app)
      .get("/api/v1/gamification/me")
      .set("Authorization", `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalXp).toBe(0);
    expect(res.body.data.level).toBe(1);
    expect(res.body.data.xpForCurrentLevel).toBe(0);
    expect(res.body.data.xpForNextLevel).toBe(100);
    expect(res.body.data.recentTransactions).toEqual([]);
  });

  it("awards +100 XP when a workout is completed, and returns xpAwarded in the response", async () => {
    const res = await createAndCompleteWorkout(userAToken, "Leg Day");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("COMPLETED");
    expect(res.body.data.xpAwarded).toBe(100);

    const state = await request(app)
      .get("/api/v1/gamification/me")
      .set("Authorization", `Bearer ${userAToken}`);
    expect(state.body.data.totalXp).toBe(100);
    expect(state.body.data.level).toBe(2);
  });

  it("does not award XP twice for completing the same workout twice", async () => {
    const created = await request(app)
      .post("/api/v1/workouts")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ title: "Push Day" });
    const workoutId = created.body.data.id;

    const first = await request(app)
      .patch(`/api/v1/workouts/${workoutId}/complete`)
      .set("Authorization", `Bearer ${userAToken}`);
    expect(first.body.data.xpAwarded).toBe(100);

    const second = await request(app)
      .patch(`/api/v1/workouts/${workoutId}/complete`)
      .set("Authorization", `Bearer ${userAToken}`);
    expect(second.status).toBe(200);
    expect(second.body.data.xpAwarded).toBe(0);

    const state = await request(app)
      .get("/api/v1/gamification/me")
      .set("Authorization", `Bearer ${userAToken}`);
    // 100 (first workout) + 100 (this workout, once) = 200, NOT 300.
    expect(state.body.data.totalXp).toBe(200);
  });

  it("crosses a level boundary correctly after enough workouts", async () => {
    // User A is at 200 XP (level 2, threshold 300). One more +100 XP
    // workout reaches exactly 300 -> level 3.
    const res = await createAndCompleteWorkout(userAToken, "Pull Day");
    expect(res.body.data.xpAwarded).toBe(100);

    const state = await request(app)
      .get("/api/v1/gamification/me")
      .set("Authorization", `Bearer ${userAToken}`);
    expect(state.body.data.totalXp).toBe(300);
    expect(state.body.data.level).toBe(3);
  });

  it("keeps gamification state fully isolated between users", async () => {
    const bState = await request(app)
      .get("/api/v1/gamification/me")
      .set("Authorization", `Bearer ${userBToken}`);
    expect(bState.body.data.totalXp).toBe(0);
    expect(bState.body.data.level).toBe(1);

    await createAndCompleteWorkout(userBToken, "User B's Workout");

    const aState = await request(app)
      .get("/api/v1/gamification/me")
      .set("Authorization", `Bearer ${userAToken}`);
    // User A's total must be unaffected by User B's workout completion.
    expect(aState.body.data.totalXp).toBe(300);
  });

  it("lists recent XP transactions scoped to the authenticated user only", async () => {
    const res = await request(app)
      .get("/api/v1/gamification/me/history")
      .set("Authorization", `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    expect(res.body.data.every((t: { eventType: string }) => t.eventType === "WORKOUT_COMPLETED")).toBe(true);

    const bHistory = await request(app)
      .get("/api/v1/gamification/me/history")
      .set("Authorization", `Bearer ${userBToken}`);
    expect(bHistory.body.data.length).toBe(1);
  });

  it("rejects an unauthenticated GET /gamification/me/history", async () => {
    const res = await request(app).get("/api/v1/gamification/me/history");
    expect(res.status).toBe(401);
  });

  it("rejects an invalid limit query parameter", async () => {
    const res = await request(app)
      .get("/api/v1/gamification/me/history?limit=not-a-number")
      .set("Authorization", `Bearer ${userAToken}`);
    expect(res.status).toBe(400);
  });
});
