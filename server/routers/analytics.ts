import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDemoUserId, logAnalyticsEvent } from "../db";

async function effectiveUserId(
  ctxUser: { id: number } | null,
): Promise<number> {
  if (ctxUser) return ctxUser.id;
  const demoId = await getDemoUserId();
  if (!demoId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return demoId;
}

export const analyticsRouter = router({
  logEvent: protectedProcedure
    .input(
      z.object({
        eventName: z.string(),
        properties: z.any().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await logAnalyticsEvent(userId, input.eventName, input.properties);
      return { success: true };
    }),
});
