import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { sanitizedString } from "../_core/sanitize";
import { protectedProcedure, router } from "../_core/trpc";
import {
  addAnimal,
  addDeworming,
  addDiagnosticTest,
  addLicensing,
  addOtherTreatment,
  addVaccination,
  createShareInvitation,
  deleteDeworming,
  deleteDiagnosticTest,
  deleteLicensing,
  deleteOtherTreatment,
  deleteVaccination,
  getActiveAnimal,
  getAnimalBaseline,
  getAnimalById,
  getAnimalShares,
  getAnimalsByUser,
  getDewormings,
  getDiagnosticTests,
  getLatestBeliefState,
  getLicensing,
  getOtherTreatments,
  getPendingInvitations,
  getVaccinations,
  getWeeklyStats,
  recalculateAnimalBehaviorBaseline,
  removeAnimalShare,
  respondToInvitation,
  saveBreedFeedback,
  setActiveAnimal,
  updateAnimal,
  updateAnimalBaseline,
  verifyAnimalOwner,
} from "../db";
import { effectiveUserId } from "../lib/authHelpers";

export const animalsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = await effectiveUserId(ctx.user);
    return getAnimalsByUser(userId);
  }),

  add: protectedProcedure
    .input(
      z.object({
        name: sanitizedString(100),
        species: z.enum(["dog", "cat"]),
        breed: sanitizedString(100).optional().nullable(),
        age: z.number().int().min(0).max(30).optional().nullable(),
        dateOfBirth: z.string().optional().nullable(),
        sex: z.enum(["male", "female", "unknown"]).optional(),
        color: sanitizedString(100).optional().nullable(),
        coat: z.enum(["short", "medium", "long"]).optional().nullable(),
        photoUrl: z
          .string()
          .optional()
          .nullable()
          .refine(
            (val) => {
              if (!val) return true;
              if (val.startsWith("http://") || val.startsWith("https://"))
                return true;
              const match = val.match(/^data:([^;]+);base64,/);
              if (!match) return false;
              const mime = match[1];
              const ALLOWED = [
                "image/jpeg",
                "image/jpg",
                "image/png",
                "image/webp",
                "application/pdf",
              ];
              if (!ALLOWED.includes(mime.toLowerCase())) return false;
              const size = (val.length * 3) / 4;
              return size <= 5 * 1024 * 1024; // 5MB
            },
            { message: "Ficheiro inválido ou demasiado grande. Máximo 5MB." },
          ),
        microchipNumber: sanitizedString(15).optional().nullable(),
        height: sanitizedString(50).optional().nullable(),
        tail: sanitizedString(50).optional().nullable(),
        specialMarkings: sanitizedString(500).optional().nullable(),
        weight: sanitizedString(50).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      return addAnimal({ ...input, userId });
    }),

  update: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        name: sanitizedString(100).optional(),
        species: z.enum(["dog", "cat"]).optional(),
        breed: sanitizedString(100).optional().nullable(),
        age: z.number().int().min(0).max(30).optional().nullable(),
        dateOfBirth: z.string().optional().nullable(),
        sex: z.enum(["male", "female", "unknown"]).optional(),
        color: sanitizedString(100).optional().nullable(),
        coat: z.enum(["short", "medium", "long"]).optional().nullable(),
        photoUrl: z
          .string()
          .optional()
          .nullable()
          .refine(
            (val) => {
              if (!val) return true;
              if (val.startsWith("http://") || val.startsWith("https://"))
                return true;
              const match = val.match(/^data:([^;]+);base64,/);
              if (!match) return false;
              const mime = match[1];
              const ALLOWED = [
                "image/jpeg",
                "image/jpg",
                "image/png",
                "image/webp",
                "application/pdf",
              ];
              if (!ALLOWED.includes(mime.toLowerCase())) return false;
              const size = (val.length * 3) / 4;
              return size <= 5 * 1024 * 1024; // 5MB
            },
            { message: "Ficheiro inválido ou demasiado grande. Máximo 5MB." },
          ),
        microchipNumber: sanitizedString(15).optional().nullable(),
        height: sanitizedString(50).optional().nullable(),
        tail: sanitizedString(50).optional().nullable(),
        specialMarkings: sanitizedString(500).optional().nullable(),
        weight: sanitizedString(50).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      const { animalId, ...data } = input;
      await verifyAnimalOwner(animalId, userId, true);
      return updateAnimal(animalId, data);
    }),

  setActive: protectedProcedure
    .input(z.object({ animalId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await setActiveAnimal(input.animalId, userId);
      return { success: true };
    }),

  getActive: protectedProcedure.query(async ({ ctx }) => {
    const userId = await effectiveUserId(ctx.user);
    return getActiveAnimal(userId);
  }),

  weeklyStats: protectedProcedure
    .input(z.object({ animalId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      return getWeeklyStats(userId, input.animalId);
    }),

  get: protectedProcedure
    .input(z.object({ animalId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      const animal = await getAnimalById(input.animalId, userId);
      if (!animal) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Animal não encontrado ou não pertence a este utilizador.",
        });
      }
      return animal;
    }),

  getBaseline: protectedProcedure
    .input(z.object({ animalId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId);
      try {
        return await recalculateAnimalBehaviorBaseline(input.animalId, userId);
      } catch {
        return getAnimalBaseline(input.animalId);
      }
    }),

  updateBaseline: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        vocalizationThreshold: z.number().int().min(1).max(100).optional(),
        normalStates: z.array(z.string()).optional(),
        alertSensitivity: z.enum(["low", "medium", "high"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId, true);
      return updateAnimalBaseline(input.animalId, input);
    }),

  getBeliefState: protectedProcedure
    .input(z.object({ animalId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId);
      return getLatestBeliefState(input.animalId);
    }),

  inviteShare: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        email: z.string().email(),
        permission: z.enum(["read", "write"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      const animal = await getAnimalById(input.animalId, userId);
      if (!animal) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Apenas o proprietario pode convidar co-tutores.",
        });
      }
      return createShareInvitation(
        userId,
        input.animalId,
        input.email,
        input.permission,
      );
    }),

  listShares: protectedProcedure
    .input(z.object({ animalId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId);
      return getAnimalShares(input.animalId);
    }),

  removeShare: protectedProcedure
    .input(z.object({ shareId: z.number(), animalId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      const animal = await getAnimalById(input.animalId, userId);
      if (!animal) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Apenas o proprietario pode revogar partilhas.",
        });
      }
      await removeAnimalShare(userId, input.shareId);
      return { success: true };
    }),

  getPendingInvitations: protectedProcedure.query(async ({ ctx }) => {
    const userId = await effectiveUserId(ctx.user);
    return getPendingInvitations(userId);
  }),

  respondToInvitation: protectedProcedure
    .input(
      z.object({
        invitationId: z.number(),
        action: z.enum(["accept", "reject"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await respondToInvitation(userId, input.invitationId, input.action);
      return { success: true };
    }),

  saveBreedFeedback: protectedProcedure
    .input(
      z.object({
        animalType: z.enum(["dog", "cat"]),
        predictedBreed: z.string(),
        confirmedBreed: z.string(),
        confidence: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      await saveBreedFeedback(input);
      return { success: true };
    }),

  getVaccinations: protectedProcedure
    .input(z.object({ animalId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId);
      return getVaccinations(input.animalId);
    }),

  addVaccination: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        vaccineName: z.string().min(1).max(100),
        vaccineType: z.enum(["rabies", "other"]),
        dateAdministered: z.string().length(10),
        batchNumber: z.string().max(50).optional().nullable(),
        veterinarian: z.string().max(100).optional().nullable(),
        nextDueDate: z.string().length(10).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId, true);
      return addVaccination(input);
    }),

  deleteVaccination: protectedProcedure
    .input(z.object({ id: z.number(), animalId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId, true);
      return deleteVaccination(input.id);
    }),

  getDewormings: protectedProcedure
    .input(z.object({ animalId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId);
      return getDewormings(input.animalId);
    }),

  addDeworming: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        type: z.enum(["internal", "external", "both"]),
        product: z.string().min(1).max(100),
        dosage: z.string().max(100).optional().nullable(),
        dateAdministered: z.string().length(10),
        nextDueDate: z.string().length(10).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId, true);
      return addDeworming(input);
    }),

  deleteDeworming: protectedProcedure
    .input(z.object({ id: z.number(), animalId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId, true);
      return deleteDeworming(input.id);
    }),

  getDiagnosticTests: protectedProcedure
    .input(z.object({ animalId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId);
      return getDiagnosticTests(input.animalId);
    }),

  addDiagnosticTest: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        testName: z.string().min(1).max(100),
        datePerformed: z.string().length(10),
        result: z.string().min(1).max(200),
        notes: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId, true);
      return addDiagnosticTest(input);
    }),

  deleteDiagnosticTest: protectedProcedure
    .input(z.object({ id: z.number(), animalId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId, true);
      return deleteDiagnosticTest(input.id);
    }),

  getOtherTreatments: protectedProcedure
    .input(z.object({ animalId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId);
      return getOtherTreatments(input.animalId);
    }),

  addOtherTreatment: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        treatmentName: z.string().min(1).max(200),
        dateAdministered: z.string().length(10),
        notes: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId, true);
      return addOtherTreatment(input);
    }),

  deleteOtherTreatment: protectedProcedure
    .input(z.object({ id: z.number(), animalId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId, true);
      return deleteOtherTreatment(input.id);
    }),

  getLicensing: protectedProcedure
    .input(z.object({ animalId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId);
      return getLicensing(input.animalId);
    }),

  addLicensing: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        licenseNumber: z.string().min(1).max(100),
        issueDate: z.string().length(10),
        expiryDate: z.string().length(10).optional().nullable(),
        issuingAuthority: z.string().min(1).max(150),
        category: z.enum([
          "companion",
          "dangerous",
          "potentially_dangerous",
          "hunting",
          "guard",
          "other",
        ]),
        notes: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId, true);
      return addLicensing(input);
    }),

  deleteLicensing: protectedProcedure
    .input(z.object({ id: z.number(), animalId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId, true);
      return deleteLicensing(input.id);
    }),
});
