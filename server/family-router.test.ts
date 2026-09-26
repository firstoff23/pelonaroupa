import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

const { mockDb } = vi.hoisted(() => {
  const families: any[] = [];
  const invites: any[] = [];
  const members: any[] = [
    { familyId: 1, userId: 1, role: "admin", joinedAt: new Date().toISOString() },
  ];
  const sharedAnimals: any[] = [];

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
    getDemoUserId: vi.fn().mockResolvedValue(1),
    createFamilyGroup: vi.fn().mockImplementation(async (userId: number, name: string) => {
      const id = families.length + 1;
      const fam = { id, name, ownerId: userId, createdAt: new Date().toISOString() };
      families.push(fam);
      return fam;
    }),
    createFamilyInviteForUser: vi.fn().mockImplementation(async (userId: number, familyId: number) => {
      const code = "ABC123";
      const invite = {
        id: invites.length + 1,
        code,
        inviteUrl: `https://animalmind.local/join/${code}`,
        familyId,
      };
      invites.push(invite);
      return invite;
    }),
    joinFamilyByInviteCode: vi.fn().mockImplementation(async (userId: number, code: string) => {
      members.push({
        familyId: 1,
        userId,
        role: "member",
        joinedAt: new Date().toISOString(),
      });
      return { success: true, familyId: 1 };
    }),
    getFamilyMembersForUser: vi.fn().mockImplementation(async (_userId: number) => {
      return members;
    }),
    shareAnimalWithFamily: vi.fn().mockImplementation(
      async (_userId: number, animalId: number, familyId: number) => {
        sharedAnimals.push({ familyId, animalId });
        return { success: true, familyId, animalId };
      },
    ),
    getFamilyAnimalsForUser: vi.fn().mockImplementation(async (_userId: number) => {
      return sharedAnimals.map((sa) => ({
        id: sa.animalId,
        familyId: sa.familyId,
        name: "Bobi",
        species: "dog",
      }));
    }),
  };

  return { mockDb };
});

// Mock local do db.ts — evita dependência de env vars de produção
vi.mock("./db", () => mockDb);

function createMockContext(id: number, email: string): TrpcContext {
  return {
    user: {
      id,
      openId: `family-router-${id}`,
      email,
      name: `Family User ${id}`,
      loginMethod: "demo",
      role: "owner",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as any,
    res: {} as any,
  };
}

describe("tRPC familyRouter", () => {
  const ownerAnimalId = 1;
  const ownerCtx = createMockContext(1, "demo@animalmind.local");
  const memberCtx = createMockContext(2, "family-member@animalmind.local");
  const ownerCaller = appRouter.createCaller(ownerCtx);
  const memberCaller = appRouter.createCaller(memberCtx);

  it("creates a family, generates invite and lets a member join", async () => {
    const family = await ownerCaller.family.create({ name: "Família Teste" });
    expect(family.name).toBe("Família Teste");

    const invite = await ownerCaller.family.createInvite({
      familyId: family.id,
    });
    expect(invite.code).toHaveLength(6);
    expect(invite.inviteUrl).toContain(`/join/${invite.code}`);

    const joined = await memberCaller.family.join({ code: invite.code });
    expect(joined).toEqual({ success: true, familyId: family.id });

    const members = await ownerCaller.family.getMembers();
    expect(members.some((member) => member.userId === memberCtx.user.id)).toBe(
      true,
    );
  });

  it("shares an animal with the family and lists shared animals", async () => {
    const family = await ownerCaller.family.create({ name: "Família Animal" });
    const result = await ownerCaller.family.shareAnimal({
      familyId: family.id,
      animalId: ownerAnimalId,
    });
    expect(result).toEqual({
      success: true,
      familyId: family.id,
      animalId: ownerAnimalId,
    });

    const animals = await ownerCaller.family.getAnimals();
    expect(animals.some((animal) => Number(animal.id) === ownerAnimalId)).toBe(
      true,
    );
  });
});
