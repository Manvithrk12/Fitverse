import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../config/prisma";

const app = createApp();

const userAEmail = `phase2-workout-a-${Date.now()}@fitverse.test`;
const userBEmail = `phase2-workout-b-${Date.now()}@fitverse.test`;
const password = "correct-horse-battery-staple";

let userAToken: string;
let userBToken: string;
let workoutId: string;

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [userAEmail, userBEmail] } } });
  await prisma.$disconnect();
});

describe("Workout API (integration)", () => {
  it("sets up two authenticated users", async () => {
    const a = await request(app).post("/api/v1/auth/register").send({ email: userAEmail, password });
    const b = await request(app).post("/api/v1/auth/register").send({ email: userBEmail, password });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    userAToken = a.body.data.accessToken;
    userBToken = b.body.data.accessToken;
  });

  it("rejects an unauthenticated GET", async () => {
    const res = await request(app).get("/api/v1/workouts");
    expect(res.status).toBe(401);
  });

  it("rejects an unauthenticated POST", async () => {
    const res = await request(app).post("/api/v1/workouts").send({ title: "Push Day" });
    expect(res.status).toBe(401);
  });

  it("creates a workout for the authenticated user, defaulting to PLANNED", async () => {
    const res = await request(app)
      .post("/api/v1/workouts")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({
        title: "Push Day",
        workoutType: "STRENGTH_TRAINING",
        description: "Chest, shoulders, triceps",
        scheduledDate: "2026-09-05T00:00:00.000Z",
        durationMinutes: 60,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe("Push Day");
    expect(res.body.data.status).toBe("PLANNED");
    expect(res.body.data.completedAt).toBeNull();
    workoutId = res.body.data.id;
  });

  it("lists only the authenticated user's workouts", async () => {
    const res = await request(app)
      .get("/api/v1/workouts")
      .set("Authorization", `Bearer ${userAToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((w: { id: string }) => w.id === workoutId)).toBe(true);
  });

  it("gets the individual workout", async () => {
    const res = await request(app)
      .get(`/api/v1/workouts/${workoutId}`)
      .set("Authorization", `Bearer ${userAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(workoutId);
  });

  it("updates the workout (full-replace)", async () => {
    const res = await request(app)
      .put(`/api/v1/workouts/${workoutId}`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ title: "Push Day (updated)", durationMinutes: 75 });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Push Day (updated)");
    expect(res.body.data.durationMinutes).toBe(75);
    // workoutType/description/scheduledDate omitted -> cleared to null.
    expect(res.body.data.workoutType).toBeNull();
    expect(res.body.data.description).toBeNull();
  });

  it("rejects invalid workout input (empty title)", async () => {
    const res = await request(app)
      .put(`/api/v1/workouts/${workoutId}`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ title: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an invalid workoutType enum value", async () => {
    const res = await request(app)
      .put(`/api/v1/workouts/${workoutId}`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ title: "Push Day", workoutType: "BALLROOM_DANCING" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an out-of-range duration", async () => {
    const res = await request(app)
      .put(`/api/v1/workouts/${workoutId}`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ title: "Push Day", durationMinutes: 0 });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid scheduledDate", async () => {
    const res = await request(app)
      .put(`/api/v1/workouts/${workoutId}`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ title: "Push Day", scheduledDate: "not-a-date" });
    expect(res.status).toBe(400);
  });

  it("marks the workout completed", async () => {
    const res = await request(app)
      .patch(`/api/v1/workouts/${workoutId}/complete`)
      .set("Authorization", `Bearer ${userAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("COMPLETED");
    expect(res.body.data.completedAt).not.toBeNull();
  });

  it("completing an already-completed workout is safe and idempotent", async () => {
    const first = await request(app)
      .get(`/api/v1/workouts/${workoutId}`)
      .set("Authorization", `Bearer ${userAToken}`);
    const firstCompletedAt = first.body.data.completedAt;

    const res = await request(app)
      .patch(`/api/v1/workouts/${workoutId}/complete`)
      .set("Authorization", `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("COMPLETED");
    // Repeat completion must not error and must not rewrite completedAt.
    expect(res.body.data.completedAt).toBe(firstCompletedAt);
  });

  it("user B cannot GET user A's workout", async () => {
    const res = await request(app)
      .get(`/api/v1/workouts/${workoutId}`)
      .set("Authorization", `Bearer ${userBToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("WORKOUT_NOT_FOUND");
  });

  it("user B cannot UPDATE user A's workout", async () => {
    const res = await request(app)
      .put(`/api/v1/workouts/${workoutId}`)
      .set("Authorization", `Bearer ${userBToken}`)
      .send({ title: "Hijacked" });
    expect(res.status).toBe(404);

    // Confirm it truly wasn't modified.
    const check = await request(app)
      .get(`/api/v1/workouts/${workoutId}`)
      .set("Authorization", `Bearer ${userAToken}`);
    expect(check.body.data.title).toBe("Push Day (updated)");
  });

  it("user B cannot COMPLETE user A's workout", async () => {
    const res = await request(app)
      .patch(`/api/v1/workouts/${workoutId}/complete`)
      .set("Authorization", `Bearer ${userBToken}`);
    expect(res.status).toBe(404);
  });

  it("user B cannot DELETE user A's workout", async () => {
    const res = await request(app)
      .delete(`/api/v1/workouts/${workoutId}`)
      .set("Authorization", `Bearer ${userBToken}`);
    expect(res.status).toBe(404);

    // Still there for its rightful owner.
    const check = await request(app)
      .get(`/api/v1/workouts/${workoutId}`)
      .set("Authorization", `Bearer ${userAToken}`);
    expect(check.status).toBe(200);
  });

  it("deletes the workout for its owner", async () => {
    const res = await request(app)
      .delete(`/api/v1/workouts/${workoutId}`)
      .set("Authorization", `Bearer ${userAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);
  });

  it("a deleted workout can no longer be fetched", async () => {
    const res = await request(app)
      .get(`/api/v1/workouts/${workoutId}`)
      .set("Authorization", `Bearer ${userAToken}`);
    expect(res.status).toBe(404);
  });
});
