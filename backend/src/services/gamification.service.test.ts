import { beforeEach, describe, expect, it, vi } from "vitest";

const transactionMock = vi.fn();
vi.mock("../config/prisma", () => ({
  prisma: { $transaction: transactionMock },
}));

const getOrCreateProfileMock = vi.fn();
const updateProfileXpMock = vi.fn();
const findTransactionByReferenceMock = vi.fn();
const createTransactionMock = vi.fn();

vi.mock("../repositories/gamification.repository", () => ({
  getOrCreateProfile: (...args: unknown[]) => getOrCreateProfileMock(...args),
  updateProfileXp: (...args: unknown[]) => updateProfileXpMock(...args),
  findTransactionByReference: (...args: unknown[]) => findTransactionByReferenceMock(...args),
  createTransaction: (...args: unknown[]) => createTransactionMock(...args),
  listRecentTransactions: vi.fn(),
}));

const FAKE_TX = { marker: "fake-transaction-client" };

beforeEach(() => {
  transactionMock.mockReset();
  transactionMock.mockImplementation((cb: (tx: unknown) => unknown) => cb(FAKE_TX));
  getOrCreateProfileMock.mockReset();
  updateProfileXpMock.mockReset();
  findTransactionByReferenceMock.mockReset();
  createTransactionMock.mockReset();
});

describe("gamification.service — awardXp", () => {
  it("awards XP, updates the profile, and reports a level-up when the threshold is crossed", async () => {
    const { awardXp } = await import("./gamification.service");

    getOrCreateProfileMock.mockResolvedValue({ totalXp: 0, level: 1 });
    createTransactionMock.mockResolvedValue({});
    updateProfileXpMock.mockResolvedValue({ totalXp: 100, level: 2 });

    const result = await awardXp("user-1", "WORKOUT_COMPLETED");

    expect(createTransactionMock).toHaveBeenCalledWith(
      { userId: "user-1", amount: 100, eventType: "WORKOUT_COMPLETED", referenceId: null },
      FAKE_TX
    );
    expect(updateProfileXpMock).toHaveBeenCalledWith("user-1", 100, 2, FAKE_TX);
    expect(result.xpAwarded).toBe(100);
    expect(result.totalXp).toBe(100);
    expect(result.level).toBe(2);
    expect(result.leveledUp).toBe(true);
  });

  it("does not award XP twice for the same (userId, eventType, referenceId)", async () => {
    const { awardXp } = await import("./gamification.service");

    findTransactionByReferenceMock.mockResolvedValue({ id: "existing-tx" });
    getOrCreateProfileMock.mockResolvedValue({ totalXp: 100, level: 2 });

    const result = await awardXp("user-1", "WORKOUT_COMPLETED", "workout-abc");

    expect(findTransactionByReferenceMock).toHaveBeenCalledWith(
      "user-1",
      "WORKOUT_COMPLETED",
      "workout-abc",
      FAKE_TX
    );
    expect(createTransactionMock).not.toHaveBeenCalled();
    expect(updateProfileXpMock).not.toHaveBeenCalled();
    expect(result.xpAwarded).toBe(0);
    expect(result.leveledUp).toBe(false);
    expect(result.totalXp).toBe(100);
  });

  it("treats a unique-constraint race (P2002) as a safe idempotent no-op, not an error", async () => {
    const { awardXp } = await import("./gamification.service");

    transactionMock.mockRejectedValueOnce({ code: "P2002" });
    getOrCreateProfileMock.mockResolvedValue({ totalXp: 200, level: 2 });

    const result = await awardXp("user-1", "WORKOUT_COMPLETED", "workout-xyz");

    expect(getOrCreateProfileMock).toHaveBeenCalledWith("user-1");
    expect(result.xpAwarded).toBe(0);
    expect(result.leveledUp).toBe(false);
  });

  it("re-throws non-constraint errors instead of swallowing them", async () => {
    const { awardXp } = await import("./gamification.service");

    transactionMock.mockRejectedValueOnce(new Error("connection lost"));

    await expect(awardXp("user-1", "WORKOUT_COMPLETED")).rejects.toThrow("connection lost");
  });
});
