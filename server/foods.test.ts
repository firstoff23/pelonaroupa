import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

const { mockDb, mockFoods } = vi.hoisted(() => {
  const mockFoods = [
    {
      id: "f1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      name: "Uva",
      aliases: ["grape", "uvas", "passa", "raisin"],
      safeFor: [] as string[],
      dangerousFor: [] as string[],
      toxicFor: ["dog", "cat"],
      severity: "toxic",
      reason: "Pode causar falha renal aguda.",
      symptoms: ["Vómitos", "Letargia"],
      whatToDo: "Contacte o veterinário imediatamente.",
      sources: ["ASPCA"],
      createdAt: new Date(),
    },
    {
      id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e",
      name: "Cenoura",
      aliases: ["carrot", "cenouras"],
      safeFor: ["dog", "cat", "rabbit"],
      dangerousFor: [] as string[],
      toxicFor: [] as string[],
      severity: "safe",
      reason: "Excelente snack rico em fibras.",
      symptoms: [],
      whatToDo: "Pode servir crua ou cozida.",
      sources: ["AKC"],
      createdAt: new Date(),
    },
    {
      id: "b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6f",
      name: "Leite",
      aliases: ["milk", "lactose"],
      safeFor: [] as string[],
      dangerousFor: ["dog", "cat"],
      toxicFor: [] as string[],
      severity: "caution",
      reason: "Intolerância à lactose.",
      symptoms: ["Diarreia", "Gases"],
      whatToDo: "Evite lacticínios normais.",
      sources: ["Cornell Vet"],
      createdAt: new Date(),
    },
  ];

  function computeSeverity(food: any, species?: string) {
    if (!species) return food.severity;
    const spec = species.toLowerCase().trim();
    if (food.toxicFor.includes(spec)) return "toxic";
    if (food.dangerousFor.includes(spec)) return "dangerous";
    if (food.safeFor.includes(spec)) return "safe";
    return food.severity;
  }

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
    getFoods: vi.fn().mockImplementation(async (species?: string) => {
      let results = mockFoods.map((f) => ({
        ...f,
        computedSeverity: computeSeverity(f, species),
      }));
      if (species) {
        const spec = species.toLowerCase().trim();
        results = results.filter(
          (f) =>
            f.safeFor.includes(spec) ||
            f.dangerousFor.includes(spec) ||
            f.toxicFor.includes(spec),
        );
      }
      return results;
    }),
    getFoodById: vi.fn().mockImplementation(async (id: string, species?: string) => {
      const f = mockFoods.find((x) => x.id === id);
      if (!f) return null;
      return { ...f, computedSeverity: computeSeverity(f, species) };
    }),
    searchFoods: vi.fn().mockImplementation(async (query: string, species?: string) => {
      const q = query.toLowerCase().trim();
      const matched = mockFoods.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.aliases.some((a: string) => a.toLowerCase().includes(q)),
      );
      return matched.map((f) => ({
        ...f,
        computedSeverity: computeSeverity(f, species),
      }));
    }),
  };

  return { mockDb, mockFoods };
});

// Mock local do db.ts — evita dependência de env vars de produção
vi.mock("./db", () => mockDb);

function createMockContext(): TrpcContext {
  return {
    user: null, // guest user
    req: {} as any,
    res: {} as any,
  };
}

describe("tRPC foodsRouter", () => {
  const ctx = createMockContext();
  const caller = appRouter.createCaller(ctx);

  it("can list all foods and compute severity without species", async () => {
    const foods = await caller.foods.getAll();
    expect(foods.length).toBeGreaterThan(0);
    expect(foods[0].name).toBe("Uva");
    expect(foods[0].computedSeverity).toBe("toxic");
  });

  it("can list all foods and compute severity for a specific species (dog)", async () => {
    const foods = await caller.foods.getAll({ species: "dog" });
    const cenoura = foods.find((f) => f.name === "Cenoura");
    expect(cenoura).toBeDefined();
    expect(cenoura!.computedSeverity).toBe("safe");

    const leite = foods.find((f) => f.name === "Leite");
    expect(leite).toBeDefined();
    expect(leite!.computedSeverity).toBe("dangerous");
  });

  it("can get a food by id", async () => {
    const food = await caller.foods.getById({ id: mockFoods[0].id });
    expect(food.name).toBe("Uva");
  });

  it("can search for foods by name", async () => {
    const results = await caller.foods.search({ query: "uva", species: "dog" });
    expect(results.length).toBe(1);
    expect(results[0].name).toBe("Uva");
    expect(results[0].computedSeverity).toBe("toxic");
  });

  it("can search for foods by alias/synonym", async () => {
    const results = await caller.foods.search({
      query: "carrot",
      species: "rabbit",
    });
    expect(results.length).toBe(1);
    expect(results[0].name).toBe("Cenoura");
    expect(results[0].computedSeverity).toBe("safe");
  });
});
