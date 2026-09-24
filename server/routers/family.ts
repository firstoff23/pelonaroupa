import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  addCareLog,
  createFamilyGroup,
  createFamilyInviteForUser,
  deleteCareLog,
  getCareBoardForAnimal,
  getCareLogsHistory,
  getDemoUserId,
  getFamilyActivityForUser,
  getFamilyAnimalsForUser,
  getFamilyMembersForUser,
  joinFamilyByInviteCode,
  leaveFamilyForUser,
  shareAnimalWithFamily,
} from "../db";

async function effectiveUserId(
  ctxUser: { id: number } | null,
): Promise<number> {
  if (ctxUser) return ctxUser.id;
  const demoId = await getDemoUserId();
  if (!demoId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return demoId;
}

export const familyRouter = router({
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(120) }))
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      return createFamilyGroup(userId, input.name);
    }),

  join: protectedProcedure
    .input(z.object({ code: z.string().min(6).max(6) }))
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      return joinFamilyByInviteCode(userId, input.code);
    }),

  leave: protectedProcedure
    .input(z.object({ familyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await leaveFamilyForUser(userId, input.familyId);
      return { success: true };
    }),

  createInvite: protectedProcedure
    .input(z.object({ familyId: z.number().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      return createFamilyInviteForUser(userId, input?.familyId);
    }),

  getMembers: protectedProcedure.query(async ({ ctx }) => {
    const userId = await effectiveUserId(ctx.user);
    return getFamilyMembersForUser(userId);
  }),

  shareAnimal: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        familyId: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      return shareAnimalWithFamily(userId, input.animalId, input.familyId);
    }),

  getAnimals: protectedProcedure.query(async ({ ctx }) => {
    const userId = await effectiveUserId(ctx.user);
    return getFamilyAnimalsForUser(userId);
  }),

  getActivity: protectedProcedure.query(async ({ ctx }) => {
    const userId = await effectiveUserId(ctx.user);
    return getFamilyActivityForUser(userId);
  }),

  // ─── Daily Care Board / Coordenação Familiar (Inspiração 4 - Fetch) ────────
  getCareBoard: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        timezone: z.string().optional(),
        date: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      return getCareBoardForAnimal(
        input.animalId,
        userId,
        input.timezone,
        input.date,
      );
    }),

  logCare: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        careType: z.enum(["feeding", "medication", "walk", "hygiene", "other"]),
        careSubtype: z.string().optional(),
        title: z.string().min(1).max(150),
        notes: z.string().max(500).optional(),
        timezone: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      return addCareLog({
        animalId: input.animalId,
        userId,
        careType: input.careType,
        careSubtype: input.careSubtype,
        title: input.title,
        notes: input.notes,
        timezone: input.timezone,
      });
    }),

  deleteCareLog: protectedProcedure
    .input(
      z.object({
        logId: z.number(),
        animalId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await deleteCareLog(input.logId, input.animalId, userId);
      return { success: true };
    }),

  getCareHistory: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        limit: z.number().default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      return getCareLogsHistory(input.animalId, userId, input.limit);
    }),
});
