import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../config/prisma";

const app = createApp();

const userAEmail = `phase2-progress-a-${Date.now()}@fitverse.test`;
const userBEmail = `phase2-progress-b-${Date.now()}@fitverse.test`;
const password = "correct-horse-battery-staple";

let userAToken: string;
let userBToken: string;
let progressId: string;
let photoId: string;

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [userAEmail, userBEmail] } } });
  await prisma.$disconnect();
});

describe("Progress API (integration)", () => {
  it("sets up two authenticated users", async () => {
    const a = await request(app).post("/api/v1/auth/register").send({ email: userAEmail, password });
    const b = await request(app).post("/api/v1/auth/register").send({ email: userBEmail, password });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    userAToken = a.body.data.accessToken;
    userBToken = b.body.data.accessToken;
  });

  it("rejects an unauthenticated GET", async () => {
    const res = await request(app).get("/api/v1/progress");
    expect(res.status).toBe(401);
  });

  it("rejects an unauthenticated POST", async () => {
    const res = await request(app).post("/api/v1/progress").send({ weight: 80 });
    expect(res.status).toBe(401);
  });

  it("creates a progress entry with nullable measurements omitted", async () => {
    const res = await request(app)
      .post("/api/v1/progress")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({
        recordedAt: "2026-06-01T08:00:00.000Z",
        weight: 82.5,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.weight).toBe("82.5");
    expect(res.body.data.chest).toBeNull();
    expect(res.body.data.bodyFatPercent).toBeNull();
    progressId = res.body.data.id;
  });

  it("creates a second, later progress entry with full measurements", async () => {
    const res = await request(app)
      .post("/api/v1/progress")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({
        recordedAt: "2026-06-15T08:00:00.000Z",
        weight: 80,
        chest: 102,
        waist: 88,
        hips: 98,
        arms: 34,
        thighs: 58,
        bodyFatPercent: 18.5,
      });
    expect(res.status).toBe(201);
  });

  it("lists progress history ordered by recordedAt descending", async () => {
    const res = await request(app)
      .get("/api/v1/progress")
      .set("Authorization", `Bearer ${userAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    const dates = res.body.data.map((p: { recordedAt: string }) => new Date(p.recordedAt).getTime());
    const sorted = [...dates].sort((a, b) => b - a);
    expect(dates).toEqual(sorted);
  });

  it("gets a single progress entry (with empty photos array included)", async () => {
    const res = await request(app)
      .get(`/api/v1/progress/${progressId}`)
      .set("Authorization", `Bearer ${userAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(progressId);
    expect(res.body.data.photos).toEqual([]);
  });

  it("updates a progress entry (full-replace)", async () => {
    const res = await request(app)
      .put(`/api/v1/progress/${progressId}`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ recordedAt: "2026-06-01T08:00:00.000Z", weight: 81, chest: 100 });

    expect(res.status).toBe(200);
    expect(res.body.data.weight).toBe("81");
    expect(res.body.data.chest).toBe("100");
    // waist/hips/arms/thighs/bodyFatPercent omitted -> cleared to null
    expect(res.body.data.waist).toBeNull();
    expect(res.body.data.bodyFatPercent).toBeNull();
  });

  it("rejects a malformed recordedAt", async () => {
    const res = await request(app)
      .put(`/api/v1/progress/${progressId}`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ recordedAt: "not-a-date", weight: 80 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a negative/impossible weight", async () => {
    const res = await request(app)
      .put(`/api/v1/progress/${progressId}`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ recordedAt: "2026-06-01T08:00:00.000Z", weight: -5 });
    expect(res.status).toBe(400);
  });

  it("rejects an impossible body-fat percentage", async () => {
    const res = await request(app)
      .put(`/api/v1/progress/${progressId}`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ recordedAt: "2026-06-01T08:00:00.000Z", weight: 80, bodyFatPercent: 150 });
    expect(res.status).toBe(400);
  });

  it("rejects a missing required weight", async () => {
    const res = await request(app)
      .post("/api/v1/progress")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ recordedAt: "2026-06-01T08:00:00.000Z" });
    expect(res.status).toBe(400);
  });

  it("adds a progress photo", async () => {
    const res = await request(app)
      .post(`/api/v1/progress/${progressId}/photos`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ url: "https://example.com/progress/photo1.jpg" });

    expect(res.status).toBe(201);
    expect(res.body.data.url).toBe("https://example.com/progress/photo1.jpg");
    photoId = res.body.data.id;
  });

  it("rejects an empty photo url", async () => {
    const res = await request(app)
      .post(`/api/v1/progress/${progressId}/photos`)
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ url: "" });
    expect(res.status).toBe(400);
  });

  it("lists photos for a progress entry", async () => {
    const res = await request(app)
      .get(`/api/v1/progress/${progressId}/photos`)
      .set("Authorization", `Bearer ${userAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((p: { id: string }) => p.id === photoId)).toBe(true);
  });

  it("user B cannot GET user A's progress entry", async () => {
    const res = await request(app)
      .get(`/api/v1/progress/${progressId}`)
      .set("Authorization", `Bearer ${userBToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("PROGRESS_NOT_FOUND");
  });

  it("user B cannot UPDATE user A's progress entry", async () => {
    const res = await request(app)
      .put(`/api/v1/progress/${progressId}`)
      .set("Authorization", `Bearer ${userBToken}`)
      .send({ recordedAt: "2026-06-01T08:00:00.000Z", weight: 999 });
    expect(res.status).toBe(404);

    const check = await request(app)
      .get(`/api/v1/progress/${progressId}`)
      .set("Authorization", `Bearer ${userAToken}`);
    expect(check.body.data.weight).toBe("81");
  });

  it("user B cannot DELETE user A's progress entry", async () => {
    const res = await request(app)
      .delete(`/api/v1/progress/${progressId}`)
      .set("Authorization", `Bearer ${userBToken}`);
    expect(res.status).toBe(404);
  });

  it("user B cannot list photos on user A's progress entry", async () => {
    const res = await request(app)
      .get(`/api/v1/progress/${progressId}/photos`)
      .set("Authorization", `Bearer ${userBToken}`);
    expect(res.status).toBe(404);
  });

  it("user B cannot add a photo to user A's progress entry", async () => {
    const res = await request(app)
      .post(`/api/v1/progress/${progressId}/photos`)
      .set("Authorization", `Bearer ${userBToken}`)
      .send({ url: "https://example.com/hijack.jpg" });
    expect(res.status).toBe(404);
  });

  it("user B cannot delete user A's photo", async () => {
    const res = await request(app)
      .delete(`/api/v1/progress/${progressId}/photos/${photoId}`)
      .set("Authorization", `Bearer ${userBToken}`);
    expect(res.status).toBe(404);

    const check = await request(app)
      .get(`/api/v1/progress/${progressId}/photos`)
      .set("Authorization", `Bearer ${userAToken}`);
    expect(check.body.data.some((p: { id: string }) => p.id === photoId)).toBe(true);
  });

  it("deletes the photo for its owner", async () => {
    const res = await request(app)
      .delete(`/api/v1/progress/${progressId}/photos/${photoId}`)
      .set("Authorization", `Bearer ${userAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);
  });

  it("deletes the progress entry for its owner (cascades any remaining photos)", async () => {
    const res = await request(app)
      .delete(`/api/v1/progress/${progressId}`)
      .set("Authorization", `Bearer ${userAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);
  });

  it("a deleted progress entry can no longer be fetched", async () => {
    const res = await request(app)
      .get(`/api/v1/progress/${progressId}`)
      .set("Authorization", `Bearer ${userAToken}`);
    expect(res.status).toBe(404);
  });
});
