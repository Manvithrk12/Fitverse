import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../config/prisma";

const app = createApp();
const REFRESH_COOKIE_NAME = "fitverse_refresh_token";

const testEmail = `phase1-test-${Date.now()}@fitverse.test`;
const testPassword = "correct-horse-battery-staple";

function extractCookie(res: request.Response, name: string): string {
  const raw = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  const found = raw.find((c) => c.startsWith(`${name}=`));
  if (!found) {
    throw new Error(`Expected cookie "${name}" was not set on the response`);
  }
  return found.split(";")[0];
}

afterAll(async () => {
  // Clean up the user this suite created so repeated runs don't collide,
  // and close the pool so the vitest process can exit.
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.$disconnect();
});

describe("Auth flow (integration)", () => {
  it("registers a new user", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail);
    expect(res.body.data.user).not.toHaveProperty("passwordHash");
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(() => extractCookie(res, REFRESH_COOKIE_NAME)).not.toThrow();
  });

  it("rejects registering the same email twice", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("rejects registration with an invalid payload", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "not-an-email", password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects login with the wrong password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testEmail, password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects login for a nonexistent email with the same error", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nobody-here@fitverse.test", password: "whatever123" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(() => extractCookie(res, REFRESH_COOKIE_NAME)).not.toThrow();
  });

  it("rejects an unauthenticated request to a protected route", async () => {
    const res = await request(app).get("/api/v1/users/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("allows an authenticated request to a protected route", async () => {
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testEmail, password: testPassword });
    const accessToken = login.body.data.accessToken;

    const res = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(testEmail);
  });

  it("rejects a protected route with a malformed/garbage token", async () => {
    const res = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", "Bearer this.is.garbage");

    expect(res.status).toBe(401);
  });

  it("rotates the refresh token and issues a new access token", async () => {
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testEmail, password: testPassword });
    const oldRefreshCookie = extractCookie(login, REFRESH_COOKIE_NAME);
    const oldAccessToken = login.body.data.accessToken;

    const refreshed = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", oldRefreshCookie);

    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toEqual(expect.any(String));
    expect(refreshed.body.data.accessToken).not.toBe(oldAccessToken);

    // Rotation revokes the old refresh token — reusing it must now fail.
    const reused = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", oldRefreshCookie);

    expect(reused.status).toBe(401);
  });

  it("rejects /refresh with no cookie at all", async () => {
    const res = await request(app).post("/api/v1/auth/refresh");
    expect(res.status).toBe(401);
  });

  it("logs out and revokes the refresh token", async () => {
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testEmail, password: testPassword });
    const refreshCookie = extractCookie(login, REFRESH_COOKIE_NAME);

    const logoutRes = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", refreshCookie);
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.data.loggedOut).toBe(true);

    const afterLogout = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", refreshCookie);
    expect(afterLogout.status).toBe(401);
  });
});
