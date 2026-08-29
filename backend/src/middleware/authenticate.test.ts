import { describe, expect, it, vi, beforeAll } from "vitest";
import { Request, Response } from "express";

// authenticate.ts (via utils/jwt -> config/env) requires JWT_SECRET to be
// set at import time, so it must exist before these modules load.
beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-for-unit-tests-only";
});

describe("authenticate middleware", () => {
  it("rejects a request with no Authorization header", async () => {
    const { authenticate } = await import("./authenticate");
    const req = { headers: {} } as Request;
    const next = vi.fn();

    authenticate(req, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("UNAUTHORIZED");
  });

  it("rejects a malformed Authorization header (missing 'Bearer ')", async () => {
    const { authenticate } = await import("./authenticate");
    const req = { headers: { authorization: "not-a-bearer-token" } } as Request;
    const next = vi.fn();

    authenticate(req, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it("rejects an invalid/garbage token", async () => {
    const { authenticate } = await import("./authenticate");
    const req = { headers: { authorization: "Bearer not.a.valid.jwt" } } as Request;
    const next = vi.fn();

    authenticate(req, {} as Response, next);

    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it("rejects an expired token", async () => {
    const jwt = await import("jsonwebtoken");
    const { authenticate } = await import("./authenticate");
    const expired = jwt.sign(
      { sub: "user-1", role: "USER", exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.JWT_SECRET as string
    );
    const req = { headers: { authorization: `Bearer ${expired}` } } as Request;
    const next = vi.fn();

    authenticate(req, {} as Response, next);

    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it("accepts a valid token and attaches req.user", async () => {
    const { authenticate } = await import("./authenticate");
    const { signAccessToken } = await import("../utils/jwt");
    const token = signAccessToken({ sub: "user-1", role: "ADMIN" });
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const next = vi.fn();

    authenticate(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: "user-1", role: "ADMIN" });
  });
});
