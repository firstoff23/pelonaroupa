import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { sanitizedString } from "../_core/sanitize";
import { protectedProcedure, router } from "../_core/trpc";
import {
  addHealthRecord,
  addVaccine,
  deleteHealthRecord,
  deleteVaccine,
  getDemoUserId,
  getHealthRecordById,
  getHealthRecords,
  getVaccineById,
  getVaccines,
  insertEvent,
  logAnalyticsEvent,
  verifyAnimalOwner,
} from "../db";

async function effectiveUserId(
  ctxUser: { id: number } | null,
): Promise<number> {
  if (ctxUser) return ctxUser.id;
  const demoId = await getDemoUserId();
  if (!demoId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return demoId;
}

export const healthRouter = router({
  getVaccines: protectedProcedure
    .input(z.object({ animalId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId);
      return getVaccines(input.animalId);
    }),

  addVaccine: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        vaccineName: sanitizedString(100),
        vaccineType: z.enum(["rabies", "other"]),
        dateAdministered: z.string().min(1),
        batchNumber: sanitizedString(50).nullable().optional(),
        veterinarian: sanitizedString(100).nullable().optional(),
        nextDueDate: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId, true);
      return addVaccine(input);
    }),

  deleteVaccine: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      const vaccine = await getVaccineById(input.id);
      if (!vaccine) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vacina não encontrada",
        });
      }
      await verifyAnimalOwner(vaccine.animalId, userId, true);
      return deleteVaccine(input.id);
    }),

  getHealthRecords: protectedProcedure
    .input(z.object({ animalId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId);
      return getHealthRecords(input.animalId);
    }),

  addHealthRecord: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        recordType: z.enum([
          "deworming",
          "diagnostic_test",
          "other_treatment",
          "licensing",
          "notes",
        ]),
        date: z.string().min(1),
        product: sanitizedString(100).nullable().optional(),
        dosage: sanitizedString(100).nullable().optional(),
        result: sanitizedString(200).nullable().optional(),
        category: sanitizedString(100).nullable().optional(),
        notes: sanitizedString(500).nullable().optional(),
        licenseNumber: sanitizedString(100).nullable().optional(),
        issuingAuthority: sanitizedString(150).nullable().optional(),
        nextDueDate: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId, true);
      return addHealthRecord(input);
    }),

  deleteHealthRecord: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      const record = await getHealthRecordById(input.id);
      if (!record) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registo de saúde não encontrado",
        });
      }
      await verifyAnimalOwner(record.animalId, userId, true);
      return deleteHealthRecord(input.id);
    }),

  logSymptoms: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        symptomIds: z.array(z.string()).min(1),
        severity: z.enum(["low", "medium", "high"]),
        symptomsSummary: sanitizedString(100).optional(),
        notes: sanitizedString(500).nullable().optional(),
        photoUrl: z
          .string()
          .nullable()
          .optional()
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
              ];
              if (!ALLOWED.includes(mime.toLowerCase())) return false;
              const size = (val.length * 3) / 4;
              return size <= 5 * 1024 * 1024; // 5MB
            },
            { message: "Ficheiro inválido ou demasiado grande. Máximo 5MB." },
          ),
        date: z.string().optional(),
        categoryIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId, true);

      const dateStr = input.date || new Date().toISOString().split("T")[0];
      const rawSummary =
        input.symptomsSummary ||
        (input.symptomIds.length <= 4
          ? input.symptomIds.join(", ")
          : `${input.symptomIds.slice(0, 3).join(", ")} (+${input.symptomIds.length - 3})`);
      const summary = rawSummary.slice(0, 100);

      const healthRecord = await addHealthRecord({
        animalId: input.animalId,
        recordType: "notes",
        category: "symptom",
        product: summary,
        result: input.severity,
        date: dateStr,
        notes: input.notes?.trim() || null,
      });

      const contextTags = [
        "symptom",
        `severity:${input.severity}`,
        ...input.symptomIds.map((id) => `symptom:${id}`),
        ...(input.categoryIds
          ? input.categoryIds.map((c) => `category:${c}`)
          : []),
      ];

      try {
        await insertEvent({
          userId,
          animalId: input.animalId,
          state: "symptom_logged",
          confidence: 1.0,
          emoji: "🩺",
          modelUsed: "symptom_logger",
          cached: false,
          // Nota técnica: Foto de sintoma usa temporariamente o campo audioUrl como media attachment payload
          // (a tabela classification_events ainda não tem coluna photo_url dedicada; migração para attachment_url planeada para próximo refactor).
          audioUrl: input.photoUrl ?? null,
          contextTags,
        });
      } catch (evtErr) {
        console.warn(
          "[Health] Could not insert classification event for symptom:",
          evtErr,
        );
      }

      try {
        await logAnalyticsEvent(userId, "symptom_logged", {
          animalId: input.animalId,
          symptomCount: input.symptomIds.length,
          severity: input.severity,
          hasPhoto: !!input.photoUrl,
        });
      } catch (_err) {
        // Ignore analytics failure
      }

      return healthRecord;
    }),
});
