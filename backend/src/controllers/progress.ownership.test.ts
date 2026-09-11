import { describe, expect, it, vi } from "vitest";
import { Request, Response } from "express";

vi.mock("../repositories/progress.repository", () => ({
  findOwnedProgressShallow: vi.fn(),
}));

describe("ensureProgressOwnership", () => {
  it("calls next(404 AppError) when the resource is not owned by the requester — BEFORE any body validation", async () => {
    const { ensureProgressOwnership } = await import("./progress.controller");
    const repo = await import("../repositories/progress.repository");
    (repo.findOwnedProgressShallow as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = {
      params: { id: "someone-elses-entry" },
      user: { id: "user-b", role: "USER" },
      body: { recordedAt: "2026-06-01T08:00:00.000Z", weight: 999 }, // invalid body
    } as unknown as Request;
    const next = vi.fn();

    await ensureProgressOwnership(req, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("PROGRESS_NOT_FOUND");
  });

  it("calls next() with no error when the resource IS owned by the requester", async () => {
    const { ensureProgressOwnership } = await import("./progress.controller");
    const repo = await import("../repositories/progress.repository");
    (repo.findOwnedProgressShallow as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "entry-1" });

    const req = {
      params: { id: "entry-1" },
      user: { id: "user-a", role: "USER" },
      body: {},
    } as unknown as Request;
    const next = vi.fn();

    await ensureProgressOwnership(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });
});
