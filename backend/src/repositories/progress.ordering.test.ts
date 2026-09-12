import { describe, expect, it, vi, beforeEach } from "vitest";

// Mocks the Prisma client entirely — this test asserts the exact query
// shape sent to Prisma, not real database behavior (which this sandbox
// can't reach). It exists specifically to catch a regression of the bug
// where progress entries logged on the same date (recordedAt tied) came
// back in the wrong order because there was no secondary sort key.
const findManyMock = vi.fn();
vi.mock("../config/prisma", () => ({
  prisma: { progress: { findMany: findManyMock } },
}));

beforeEach(() => {
  findManyMock.mockReset();
});

describe("progress.repository — listProgressForUser ordering", () => {
  it("orders by recordedAt desc, then createdAt desc as the tiebreaker", async () => {
    const { listProgressForUser } = await import("./progress.repository");
    findManyMock.mockResolvedValue([]);

    await listProgressForUser("user-1");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
    });
  });

  it("the tiebreaker is createdAt, not updatedAt — editing an old entry must not make it look newest", async () => {
    const { listProgressForUser } = await import("./progress.repository");
    findManyMock.mockResolvedValue([]);

    await listProgressForUser("user-1");

    const [[callArgs]] = findManyMock.mock.calls;
    const secondarySort = callArgs.orderBy[1];
    expect(secondarySort).toEqual({ createdAt: "desc" });
    expect(secondarySort).not.toHaveProperty("updatedAt");
  });
});
