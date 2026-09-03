import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../config/prisma";

const app = createApp();

const userAEmail = `phase2-nutrition-a-${Date.now()}@fitverse.test`;
const userBEmail = `phase2-nutrition-b-${Date.now()}@fitverse.test`;
const password = "correct-horse-battery-staple";

let userAToken: string;
let userBToken: string;
let entryId: string;

const targetDate = "2026-06-15";
const targetDateIso = `${targetDate}T08:00:00.000Z`;
const otherDateIso = "2026-06-16T08:00:00.000Z";

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [userAEmail, userBEmail] } } });
  await prisma.$disconnect();
});

describe("Nutrition API (integration)", () => {
  it("sets up two authenticated users", async () => {
    const a = await request(app).post("/api/v1/auth/register").send({ email: userAEmail, password });
    const b = await request(app).post("/api/v1/auth/register").send({ email: userBEmail, password });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    userAToken = a.body.data.accessToken;
    userBToken = b.body.data.accessToken;
  });

  it("rejects an unauthenticated GET", async () => {
    const res = await request(app).get("/api/v1/nutrition");
    expect(res.status).toBe(401);
  });

  it("rejects an unauthenticated POST", async () => {
    const res = await request(app).post("/api/v1/nutrition").send({ foodName: "Oatmeal" });
    expect(res.status).toBe(401);
  });

  it("creates a nutrition entry", async () => {
    const res = await request(app)
      .post("/api/v1/nutrition")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({
        foodName: "Grilled Chicken Breast",
        mealType: "LUNCH",
        servingSize: "200g",
        calories: 330,
        proteinGrams: 62,
        carbohydratesGrams: 0,
        fatGrams: 7.5,
        consumedAt: targetDateIso,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.foodName).toBe("Grilled Chicken Breast");
    expect(res.body.data.mealType).toBe("LUNCH");
    entryId = res.body.data.id;
  });

  it("lists the user's nutrition entries", async () => {
    const res = await request(app)
      .get("/api/v1/nutrition")
      .set("Authorization", `Bearer ${userAToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((e: { id: string }) => e.id === entryId)).toBe(true);
  });

  it("gets the individual entry", async () => {
    const res = await request(app)
      .get(`/api/v1/nutrition/${entryId}`)
      .set("Authorization", `Bearer ${userAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(entryId);
  });

  it("updates the entry (full-replace)", async () => {
    const res = await request(app)
      .put(`/api/v1/nutrition/${entryId}`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({
        foodName: "Grilled Chicken Breast (large)",
        mealType: "LUNCH",
        servingSize: "250g",
        calories: 410,
        consumedAt: targetDateIso,
        // macros omitted -> clear to null, same full-replace convention
      });

    expect(res.status).toBe(200);
    expect(res.body.data.foodName).toBe("Grilled Chicken Breast (large)");
    expect(res.body.data.calories).toBe(410);
    expect(res.body.data.proteinGrams).toBeNull();
  });

  it("rejects an invalid food name (empty)", async () => {
    const res = await request(app)
      .put(`/api/v1/nutrition/${entryId}`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ foodName: "", mealType: "LUNCH", servingSize: "1 cup", calories: 100, consumedAt: targetDateIso });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an invalid meal type", async () => {
    const res = await request(app)
      .put(`/api/v1/nutrition/${entryId}`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ foodName: "Toast", mealType: "BRUNCH", servingSize: "1 slice", calories: 80, consumedAt: targetDateIso });
    expect(res.status).toBe(400);
  });

  it("rejects negative calories", async () => {
    const res = await request(app)
      .put(`/api/v1/nutrition/${entryId}`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ foodName: "Toast", mealType: "BREAKFAST", servingSize: "1 slice", calories: -5, consumedAt: targetDateIso });
    expect(res.status).toBe(400);
  });

  it("rejects a negative macro value", async () => {
    const res = await request(app)
      .put(`/api/v1/nutrition/${entryId}`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({
        foodName: "Toast",
        mealType: "BREAKFAST",
        servingSize: "1 slice",
        calories: 80,
        proteinGrams: -1,
        consumedAt: targetDateIso,
      });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid consumedAt", async () => {
    const res = await request(app)
      .put(`/api/v1/nutrition/${entryId}`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ foodName: "Toast", mealType: "BREAKFAST", servingSize: "1 slice", calories: 80, consumedAt: "not-a-date" });
    expect(res.status).toBe(400);
  });

  it("date filtering returns only entries for that date, with correct multi-entry totals", async () => {
    // A second entry on the same target date, plus one on a different date,
    // to prove both filtering and totals aggregation are correct.
    const secondSameDay = await request(app)
      .post("/api/v1/nutrition")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({
        foodName: "Brown Rice",
        mealType: "LUNCH",
        servingSize: "150g",
        calories: 195,
        proteinGrams: 4.5,
        carbohydratesGrams: 40,
        fatGrams: 1.5,
        consumedAt: `${targetDate}T08:30:00.000Z`,
      });
    expect(secondSameDay.status).toBe(201);

    const differentDay = await request(app)
      .post("/api/v1/nutrition")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({
        foodName: "Apple",
        mealType: "SNACK",
        servingSize: "1 medium",
        calories: 95,
        consumedAt: otherDateIso,
      });
    expect(differentDay.status).toBe(201);

    const res = await request(app)
      .get(`/api/v1/nutrition?date=${targetDate}`)
      .set("Authorization", `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    const foodNames = res.body.data.entries.map((e: { foodName: string }) => e.foodName);
    expect(foodNames).toContain("Grilled Chicken Breast (large)");
    expect(foodNames).toContain("Brown Rice");
    expect(foodNames).not.toContain("Apple");

    // 410 (updated chicken) + 195 (rice) = 605; protein/carbs/fat: chicken's
    // macros were cleared to null by the earlier full-replace update, so
    // only rice's macros contribute.
    expect(res.body.data.totals.calories).toBe(605);
    expect(res.body.data.totals.proteinGrams).toBe(4.5);
    expect(res.body.data.totals.carbohydratesGrams).toBe(40);
    expect(res.body.data.totals.fatGrams).toBe(1.5);
  });

  it("rejects a malformed date query parameter", async () => {
    const res = await request(app)
      .get("/api/v1/nutrition?date=15-06-2026")
      .set("Authorization", `Bearer ${userAToken}`);
    expect(res.status).toBe(400);
  });

  it("user B cannot GET user A's entry", async () => {
    const res = await request(app)
      .get(`/api/v1/nutrition/${entryId}`)
      .set("Authorization", `Bearer ${userBToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NUTRITION_ENTRY_NOT_FOUND");
  });

  it("user B cannot UPDATE user A's entry", async () => {
    const res = await request(app)
      .put(`/api/v1/nutrition/${entryId}`)
      .set("Authorization", `Bearer ${userBToken}`)
      .send({ foodName: "Hijacked", mealType: "SNACK", servingSize: "1", calories: 1, consumedAt: targetDateIso });
    expect(res.status).toBe(404);

    const check = await request(app)
      .get(`/api/v1/nutrition/${entryId}`)
      .set("Authorization", `Bearer ${userAToken}`);
    expect(check.body.data.foodName).toBe("Grilled Chicken Breast (large)");
  });

  it("user B cannot DELETE user A's entry", async () => {
    const res = await request(app)
      .delete(`/api/v1/nutrition/${entryId}`)
      .set("Authorization", `Bearer ${userBToken}`);
    expect(res.status).toBe(404);

    const check = await request(app)
      .get(`/api/v1/nutrition/${entryId}`)
      .set("Authorization", `Bearer ${userAToken}`);
    expect(check.status).toBe(200);
  });

  it("user B's date filtering never includes user A's entries, and user B's totals are independent", async () => {
    // User B logs an entry on the same target date as User A.
    const bEntry = await request(app)
      .post("/api/v1/nutrition")
      .set("Authorization", `Bearer ${userBToken}`)
      .send({
        foodName: "User B's Salad",
        mealType: "DINNER",
        servingSize: "1 bowl",
        calories: 250,
        proteinGrams: 10,
        consumedAt: `${targetDate}T19:00:00.000Z`,
      });
    expect(bEntry.status).toBe(201);

    const bView = await request(app)
      .get(`/api/v1/nutrition?date=${targetDate}`)
      .set("Authorization", `Bearer ${userBToken}`);

    expect(bView.status).toBe(200);
    const bFoodNames = bView.body.data.entries.map((e: { foodName: string }) => e.foodName);
    expect(bFoodNames).toEqual(["User B's Salad"]);
    expect(bView.body.data.totals.calories).toBe(250);

    // User A's totals for the same date must be unaffected by User B's entry.
    const aView = await request(app)
      .get(`/api/v1/nutrition?date=${targetDate}`)
      .set("Authorization", `Bearer ${userAToken}`);
    expect(aView.body.data.totals.calories).toBe(605);
  });

  it("deletes the entry for its owner", async () => {
    const res = await request(app)
      .delete(`/api/v1/nutrition/${entryId}`)
      .set("Authorization", `Bearer ${userAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);
  });

  it("a deleted entry can no longer be fetched", async () => {
    const res = await request(app)
      .get(`/api/v1/nutrition/${entryId}`)
      .set("Authorization", `Bearer ${userAToken}`);
    expect(res.status).toBe(404);
  });
});
