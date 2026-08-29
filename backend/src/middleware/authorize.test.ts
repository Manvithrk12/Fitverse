import { describe, expect, it, vi } from "vitest";
import { Request, Response } from "express";
import { authorize } from "./authorize";
import { AppError } from "./errorHandler";

function mockReq(user?: { id: string; role: "USER" | "ADMIN" }): Request {
  return { user } as unknown as Request;
}

describe("authorize middleware", () => {
  it("calls next() with no error when the user's role is allowed", () => {
    const req = mockReq({ id: "u1", role: "ADMIN" });
    const next = vi.fn();

    authorize("ADMIN")(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("calls next(AppError 403) when the user's role is not allowed", () => {
    const req = mockReq({ id: "u1", role: "USER" });
    const next = vi.fn();

    authorize("ADMIN")(req, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
  });

  it("calls next(AppError 401) when there is no authenticated user", () => {
    const req = mockReq(undefined);
    const next = vi.fn();

    authorize("USER", "ADMIN")(req, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("UNAUTHORIZED");
  });

  it("allows any of several listed roles", () => {
    const req = mockReq({ id: "u1", role: "USER" });
    const next = vi.fn();

    authorize("USER", "ADMIN")(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });
});
