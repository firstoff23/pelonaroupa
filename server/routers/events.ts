import { z } from "zod";
import { sanitizedString } from "../_core/sanitize";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getAllEventsForExport,
  getEventBeliefState,
  getEventNotes,
  getEventPosture,
  getEventsForAnimalPaginated,
  getEventsPaginated,
  getRecentEvents,
  getSignedAudioUrl,
  getStatsForAnimal,
  updateEventContextTags,
  updateEventFeedback,
  updateEventNotes,
} from "../db";
import { effectiveUserId } from "../lib/authHelpers";

function mapDbEvent(e: any) {
  const createdAt = e.created_at ?? e.createdAt ?? null;
  return {
    id: e.id,
    animalId: e.animal_id ?? e.animalId ?? null,
    state: e.state,
    confidence: Number(e.confidence),
    emoji: e.emoji ?? "",
    modelUsed: e.model_used ?? e.modelUsed ?? "",
    feedback: e.feedback ?? null,
    audioUrl: e.audio_url ?? e.audioUrl ?? null,
    createdAt: createdAt ? new Date(createdAt) : new Date(),
    notes: e.notes ?? null,
    contextTags: e.context_tags ?? e.contextTags ?? [],
  };
}

function mapEventForExport(e: any) {
  const createdAt = e.created_at ?? e.createdAt ?? null;
  return {
    id: e.id,
    userId: e.user_id ?? e.userId ?? null,
    animalId: e.animal_id ?? e.animalId ?? null,
    animalName: e.animals?.name ?? e.animalName ?? "",
    state: e.state,
    confidence: Number(e.confidence),
    emoji: e.emoji ?? "",
    modelUsed: e.model_used ?? e.modelUsed ?? "",
    cached: Boolean(e.cached),
    feedback: e.feedback ?? null,
    audioUrl: e.audio_url ?? e.audioUrl ?? "",
    createdAt: createdAt ? new Date(createdAt).toISOString() : "",
  };
}

export const eventsRouter = router({
  recent: protectedProcedure
    .input(z.object({ limit: z.number().default(5) }))
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      const events = await getRecentEvents(userId, input.limit);
      const mapped = events.map(mapDbEvent);
      return Promise.all(
        mapped.map(async (e) => ({
          ...e,
          audioUrl: await getSignedAudioUrl(e.audioUrl),
        })),
      );
    }),

  list: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(10),
        state: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        animalId: z.number().optional(),
        contextTag: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      const result = await getEventsPaginated(
        userId,
        input.page,
        input.pageSize,
        input.state,
        input.dateFrom,
        input.dateTo,
        input.animalId,
        input.contextTag,
      );
      const mappedEvents = await Promise.all(
        result.events.map(mapDbEvent).map(async (e) => ({
          ...e,
          audioUrl: await getSignedAudioUrl(e.audioUrl),
        })),
      );
      return {
        events: mappedEvents,
        total: result.total,
      };
    }),

  feedback: protectedProcedure
    .input(
      z.object({
        eventId: z.number(),
        feedback: z.enum(["correct", "incorrect"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await updateEventFeedback(input.eventId, userId, input.feedback);
      return { success: true };
    }),

  exportData: protectedProcedure
    .input(
      z.object({
        state: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        animalId: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      const filters = {
        state: input.state,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        animalId: input.animalId,
      };
      const events = await getAllEventsForExport(userId, filters);
      const mappedEvents = await Promise.all(
        events.map(mapEventForExport).map(async (e) => ({
          ...e,
          audioUrl: await getSignedAudioUrl(e.audioUrl),
        })),
      );
      return {
        events: mappedEvents,
        filters,
        generatedAt: new Date().toISOString(),
      };
    }),

  exportCsv: protectedProcedure.query(async ({ ctx }) => {
    const userId = await effectiveUserId(ctx.user);
    const events = await getAllEventsForExport(userId);
    const header =
      "id,state,confidence,emoji,model_used,cached,feedback,audio_url,created_at";
    const rows = await Promise.all(
      events.map(async (e: any) => {
        const signedUrl = await getSignedAudioUrl(e.audio_url);
        return [
          e.id,
          e.state,
          e.confidence,
          e.emoji,
          e.model_used,
          e.cached,
          e.feedback ?? "",
          signedUrl ?? "",
          new Date(e.created_at).toISOString(),
        ].join(",");
      }),
    );
    return { csv: [header, ...rows].join("\n") };
  }),

  getNotes: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      return getEventNotes(input.eventId);
    }),

  updateNotes: protectedProcedure
    .input(
      z.object({
        eventId: z.number(),
        notes: sanitizedString(500),
      }),
    )
    .mutation(async ({ input }) => {
      const notes = await updateEventNotes(input.eventId, input.notes);
      return { success: true, notes };
    }),

  updateTags: protectedProcedure
    .input(
      z.object({
        eventId: z.number(),
        tags: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      const tags = await updateEventContextTags(input.eventId, input.tags);
      return { success: true, tags };
    }),

  listForAnimal: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        page: z.number().default(1),
        pageSize: z.number().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      const result = await getEventsForAnimalPaginated(
        input.animalId,
        userId,
        input.page,
        input.pageSize,
      );
      const mappedEvents = await Promise.all(
        result.events.map(mapDbEvent).map(async (e) => ({
          ...e,
          audioUrl: await getSignedAudioUrl(e.audioUrl),
        })),
      );
      return {
        events: mappedEvents,
        total: result.total,
      };
    }),

  statsForAnimal: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        days: z.number().default(7),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      return getStatsForAnimal(input.animalId, userId, input.days);
    }),

  getVisualMetadata: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      const posture = await getEventPosture(input.eventId);
      const beliefState = await getEventBeliefState(input.eventId);
      return { posture, beliefState };
    }),
});
