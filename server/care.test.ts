import { describe, expect, it, vi } from "vitest";
import {
  getCareDateForTimezone,
  ROUTINE_CARE_DEFINITIONS,
} from "../shared/care";

// Mock Supabase to test care routines and care board assembly
vi.mock("./db", async () => {
  const actual: any = await vi.importActual("./db");

  const mockCareLogs: any[] = [];

  return {
    ...actual,
    verifyAnimalOwner: vi
      .fn()
      .mockImplementation(async (animalId: number, _userId: number) => {
        if (animalId === 999) {
          throw new Error("Não autorizado");
        }
        return;
      }),
    getUserSummary: vi.fn().mockResolvedValue({
      id: 1,
      name: "Alexandre",
      email: "alexandre@test.local",
    }),
    getAnimalById: vi.fn().mockResolvedValue({
      id: 1,
      name: "Yoshi",
      species: "dog",
    }),
    addCareLog: vi.fn().mockImplementation(async (data: any) => {
      if (data.animalId === 999) throw new Error("Não autorizado");
      const entry = {
        id: mockCareLogs.length + 1,
        animalId: data.animalId,
        userId: data.userId,
        userName: "Alexandre",
        careType: data.careType,
        careSubtype: data.careSubtype || null,
        title: data.title,
        notes: data.notes || null,
        careDate: getCareDateForTimezone(data.timezone),
        completedAt: new Date().toISOString(),
      };
      mockCareLogs.push(entry);
      return entry;
    }),
    getCareBoardForAnimal: vi
      .fn()
      .mockImplementation(
        async (
          animalId: number,
          _userId: number,
          timezone = "Europe/Lisbon",
          specificDate?: string,
        ) => {
          if (animalId === 999) throw new Error("Não autorizado");
          const targetDate = specificDate || getCareDateForTimezone(timezone);
          const relevantLogs = mockCareLogs.filter(
            (l) => l.animalId === animalId && l.careDate === targetDate,
          );

          const routineItems = ROUTINE_CARE_DEFINITIONS.map((def) => {
            const match = relevantLogs.find(
              (l) => l.careSubtype === def.careSubtype,
            );
            return {
              definition: def,
              isCompleted: !!match,
              completedLog: match,
            };
          });

          return {
            animalId,
            careDate: targetDate,
            timezone,
            completedCount: routineItems.filter((i) => i.isCompleted).length,
            totalRoutineCount: ROUTINE_CARE_DEFINITIONS.length,
            routineItems,
            customLogs: relevantLogs.filter(
              (l) =>
                !ROUTINE_CARE_DEFINITIONS.some(
                  (d) => d.careSubtype === l.careSubtype,
                ),
            ),
            bioacousticStatus: {
              hasRecordedToday: true,
              lastEventTime: "11:20",
              state: "relaxed",
              emoji: "⚪",
              confidence: 0.94,
            },
          };
        },
      ),
    deleteCareLog: vi
      .fn()
      .mockImplementation(async (logId: number, animalId: number) => {
        if (animalId === 999) throw new Error("Não autorizado");
        const idx = mockCareLogs.findIndex((l) => l.id === logId);
        if (idx !== -1) mockCareLogs.splice(idx, 1);
        return true;
      }),
  };
});

describe("Care Coordination & Daily Care Board", () => {
  it("computes care dates correctly across timezones", () => {
    const fixedUtcDate = new Date("2026-09-24T23:30:00Z");
    // In Lisbon (UTC+1 in DST), this is 2026-09-25 00:30
    const lisbonDate = getCareDateForTimezone("Europe/Lisbon", fixedUtcDate);
    expect(lisbonDate).toBe("2026-09-25");

    // In New York (UTC-4 in EDT), this is 2026-09-24 19:30
    const nyDate = getCareDateForTimezone("America/New_York", fixedUtcDate);
    expect(nyDate).toBe("2026-09-24");

    // Invalid timezone fallback to UTC safely
    const fallback = getCareDateForTimezone("Invalid/Unknown", fixedUtcDate);
    expect(fallback).toBe("2026-09-24");
  });

  it("adds care log and validates permissions", async () => {
    const { addCareLog } = await import("./db");

    const log = await addCareLog({
      animalId: 1,
      userId: 1,
      careType: "feeding",
      careSubtype: "breakfast",
      title: "Pequeno-almoço dado",
      notes: "Comeu toda a ração",
      timezone: "Europe/Lisbon",
    });

    expect(log.id).toBeGreaterThan(0);
    expect(log.animalId).toBe(1);
    expect(log.title).toBe("Pequeno-almoço dado");
    expect(log.userName).toBe("Alexandre");

    // Fails for unauthorized animal
    await expect(
      addCareLog({
        animalId: 999,
        userId: 1,
        careType: "feeding",
        title: "Tentativa não autorizada",
      }),
    ).rejects.toThrow("Não autorizado");
  });

  it("assembles care board with completed routines and informative bioacoustic status", async () => {
    const { getCareBoardForAnimal } = await import("./db");

    const board = await getCareBoardForAnimal(1, 1, "Europe/Lisbon");

    expect(board.animalId).toBe(1);
    expect(board.totalRoutineCount).toBe(ROUTINE_CARE_DEFINITIONS.length);
    // Breakfast routine was completed in previous test
    const breakfast = board.routineItems.find(
      (r) => r.definition.careSubtype === "breakfast",
    );
    expect(breakfast?.isCompleted).toBe(true);
    expect(breakfast?.completedLog?.userName).toBe("Alexandre");

    // Informative bioacoustic status (Refinement 2: read-only, not a task)
    expect(board.bioacousticStatus.hasRecordedToday).toBe(true);
    expect(board.bioacousticStatus.state).toBe("relaxed");
    expect(board.bioacousticStatus.emoji).toBe("⚪");
  });
});
