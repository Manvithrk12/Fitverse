import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../config/prisma";

const app = createApp();

const userAEmail = `phase2-profile-a-${Date.now()}@fitverse.test`;
const userBEmail = `phase2-profile-b-${Date.now()}@fitverse.test`;
const password = "correct-horse-battery-staple";

let userAToken: string;
let userBToken: string;

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [userAEmail, userBEmail] } } });
  await prisma.$disconnect();
});

describe("Profile API (integration)", () => {
  it("sets up two authenticated users", async () => {
    const a = await request(app).post("/api/v1/auth/register").send({ email: userAEmail, password });
    const b = await request(app).post("/api/v1/auth/register").send({ email: userBEmail, password });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    userAToken = a.body.data.accessToken;
    userBToken = b.body.data.accessToken;
  });

  it("rejects an unauthenticated GET", async () => {
    const res = await request(app).get("/api/v1/profiles/me");
    expect(res.status).toBe(401);
  });

  it("rejects an unauthenticated PUT", async () => {
    const res = await request(app).put("/api/v1/profiles/me").send({ age: 30 });
    expect(res.status).toBe(401);
  });

  it("returns 404 for a user with no profile yet", async () => {
    const res = await request(app)
      .get("/api/v1/profiles/me")
      .set("Authorization", `Bearer ${userAToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("PROFILE_NOT_FOUND");
  });

  it("creates a profile via PUT (upsert)", async () => {
    const res = await request(app)
      .put("/api/v1/profiles/me")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({
        age: 28,
        heightCm: 178,
        weightKg: 82,
        targetWeightKg: 75,
        fitnessGoal: "FAT_LOSS",
        activityLevel: "MODERATELY_ACTIVE",
        workoutFrequency: 4,
        availableEquipment: ["dumbbells", "pull-up bar"],
        dietaryPreference: "VEGETARIAN",
        preferredWorkoutType: "STRENGTH_TRAINING",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.age).toBe(28);
    expect(res.body.data.fitnessGoal).toBe("FAT_LOSS");
    expect(res.body.data.availableEquipment).toEqual(["dumbbells", "pull-up bar"]);
  });

  it("gets the now-existing profile", async () => {
    const res = await request(app)
      .get("/api/v1/profiles/me")
      .set("Authorization", `Bearer ${userAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.weightKg).toBe(82);
  });

  it("updates the existing profile via PUT, full-replace semantics", async () => {
    const res = await request(app)
      .put("/api/v1/profiles/me")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({
        age: 29,
        weightKg: 80,
        fitnessGoal: "MUSCLE_GAIN",
        // heightCm, targetWeightKg, activityLevel, etc. intentionally
        // omitted — full-replace PUT means these clear to null.
      });

    expect(res.status).toBe(200);
    expect(res.body.data.age).toBe(29);
    expect(res.body.data.weightKg).toBe(80);
    expect(res.body.data.fitnessGoal).toBe("MUSCLE_GAIN");
    expect(res.body.data.heightCm).toBeNull();
    expect(res.body.data.targetWeightKg).toBeNull();
    expect(res.body.data.availableEquipment).toEqual([]);
  });

  it("rejects invalid input types", async () => {
    const res = await request(app)
      .put("/api/v1/profiles/me")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ age: "twenty-eight" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an invalid enum value", async () => {
    const res = await request(app)
      .put("/api/v1/profiles/me")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ fitnessGoal: "GET_SHREDDED" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an out-of-range numeric value", async () => {
    const res = await request(app)
      .put("/api/v1/profiles/me")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ age: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a negative/out-of-range workout frequency", async () => {
    const res = await request(app)
      .put("/api/v1/profiles/me")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ workoutFrequency: 10 });
    expect(res.status).toBe(400);
  });

  it("keeps profiles fully isolated between users (ownership/IDOR check)", async () => {
    // User B has never created a profile — must see their own 404, never
    // User A's data. There is no endpoint that accepts another user's id
    // at all; isolation is enforced structurally via req.user.id.
    const bBeforeOwnProfile = await request(app)
      .get("/api/v1/profiles/me")
      .set("Authorization", `Bearer ${userBToken}`);
    expect(bBeforeOwnProfile.status).toBe(404);

    const bPut = await request(app)
      .put("/api/v1/profiles/me")
      .set("Authorization", `Bearer ${userBToken}`)
      .send({ age: 40, fitnessGoal: "ENDURANCE" });
    expect(bPut.status).toBe(200);
    expect(bPut.body.data.age).toBe(40);

    // User A's profile must be untouched by User B's write.
    const aAfter = await request(app)
      .get("/api/v1/profiles/me")
      .set("Authorization", `Bearer ${userAToken}`);
    expect(aAfter.status).toBe(200);
    expect(aAfter.body.data.age).toBe(29);
    expect(aAfter.body.data.fitnessGoal).toBe("MUSCLE_GAIN");
  });
});
