import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

const { mockDb, mockSupabaseClient } = vi.hoisted(() => {
  const mockNotes: Record<number, string> = {};

  const mockSupabaseClient = {
    from: vi.fn(() => mockSupabaseClient),
    select: vi.fn(() => mockSupabaseClient),
    insert: vi.fn(() => mockSupabaseClient),
    update: vi.fn(() => mockSupabaseClient),
    delete: vi.fn(() => mockSupabaseClient),
    eq: vi.fn(() => mockSupabaseClient),
    single: vi.fn(),
  };

  const mockDb = {
    getSupabase: () => mockSupabaseClient,
    getSupabaseAnon: () => mockSupabaseClient,
    updateEventNotes: vi
      .fn()
      .mockImplementation(async (eventId: number, notes: string) => {
        mockNotes[eventId] = notes;
        return notes;
      }),
    getEventNotes: vi.fn().mockImplementation(async (eventId: number) => {
      return mockNotes[eventId] || "";
    }),
  };

  return { mockDb, mockSupabaseClient };
});

// Mock local do db.ts — evita dependência de env vars de produção
vi.mock("./db", () => mockDb);

function createMockContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "demo-user-001",
      email: "demo@animalmind.local",
      name: "Demo User",
      loginMethod: "demo",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as any,
    res: {} as any,
  };
}

describe("events.notes", () => {
  const ctx = createMockContext();
  const caller = appRouter.createCaller(ctx);
  const testEventId = 99999;
  const testNote = "Nota de teste do vitest";

  it("can write a note for an event and retrieve it", async () => {
    // 1. Update notes
    const updateResult = await caller.events.updateNotes({
      eventId: testEventId,
      notes: testNote,
    });
    expect(updateResult.success).toBe(true);
    expect(updateResult.notes).toBe(testNote);

    // 2. Query event notes to confirm retrieval
    const queryResult = await caller.events.getNotes({
      eventId: testEventId,
    });
    expect(queryResult).toBe(testNote);
  });

  it("can clear notes (empty string)", async () => {
    const updateResult = await caller.events.updateNotes({
      eventId: testEventId,
      notes: "",
    });
    expect(updateResult.success).toBe(true);
    expect(updateResult.notes).toBe("");

    const queryResult = await caller.events.getNotes({
      eventId: testEventId,
    });
    expect(queryResult).toBe("");
  });
});
