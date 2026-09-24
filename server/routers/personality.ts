// server/routers/personality.ts
// Inspiração 5 – tRPC router for Personality Profile
//
// Endpoints:
//   personality.get        – read current profile (or provisional default)
//   personality.override   – apply tutor dimension override
//   personality.recalculate – force re-inference (tutor only)

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getSupabase, verifyAnimalOwner } from "../db";
import { effectiveUserId } from "../lib/authHelpers";
import {
  applyUserOverride,
  getPersonality,
  inferAndSavePersonality,
} from "../services/personality";
import {
  DEFAULT_PERSONALITY,
  PERSONALITY_DIMENSIONS,
  type AnimalPersonality,
} from "../../shared/personality";

// Zod schema for a single dimension override value
const dimensionOverrideSchema = z.number().int().min(1).max(5);

// Zod object for partial override
const overrideInputSchema = z
  .object(
    Object.fromEntries(
      PERSONALITY_DIMENSIONS.map((d) => [d, dimensionOverrideSchema.optional()]),
    ) as Record<(typeof PERSONALITY_DIMENSIONS)[number], typeof dimensionOverrideSchema | z.ZodOptional<typeof dimensionOverrideSchema>>,
  )
  .refine((val) => Object.values(val).some((v) => v !== undefined), {
    message: "At least one dimension override is required.",
  });

export const personalityRouter = router({
  /**
   * personality.get
   * Returns the current personality profile for an animal.
   * If no row exists yet (insufficient data), returns DEFAULT_PERSONALITY
   * with confidence = 0 so the UI can show a provisional state.
   */
  get: protectedProcedure
    .input(z.object({ animalId: z.number() }))
    .query(async ({ ctx, input }): Promise<AnimalPersonality> => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId);

      const supabase = getSupabase();
      const profile = await getPersonality(supabase, input.animalId);
      if (!profile) {
        return { ...DEFAULT_PERSONALITY, animalId: input.animalId };
      }
      return profile;
    }),

  /**
   * personality.override
   * Tutor sets one or more dimension values manually.
   * Merges with existing inferred values; source becomes 'blended'.
   */
  override: protectedProcedure
    .input(
      z.object({
        animalId: z.number(),
        dimensions: overrideInputSchema,
      }),
    )
    .mutation(async ({ ctx, input }): Promise<AnimalPersonality> => {
      const userId = await effectiveUserId(ctx.user);
      // Only owner can override (not family read-only)
      await verifyAnimalOwner(input.animalId, userId, true);

      const supabase = getSupabase();
      try {
        return await applyUserOverride(
          supabase,
          input.animalId,
          input.dimensions as Record<string, number>,
        );
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Não foi possível guardar o ajuste de personalidade.",
          cause: err,
        });
      }
    }),

  /**
   * personality.recalculate
   * Force a fresh inference run from the latest events.
   * Useful when the tutor wants to "reset" user overrides.
   */
  recalculate: protectedProcedure
    .input(z.object({ animalId: z.number() }))
    .mutation(async ({ ctx, input }): Promise<AnimalPersonality> => {
      const userId = await effectiveUserId(ctx.user);
      await verifyAnimalOwner(input.animalId, userId, true);

      const supabase = getSupabase();
      await inferAndSavePersonality(supabase, input.animalId, 500);

      const profile = await getPersonality(supabase, input.animalId);
      if (!profile) {
        return { ...DEFAULT_PERSONALITY, animalId: input.animalId };
      }
      return profile;
    }),
});
