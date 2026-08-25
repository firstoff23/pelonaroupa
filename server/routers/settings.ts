import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDemoUserId, getSettings, upsertSettings } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

async function effectiveUserId(ctxUser: { id: number } | null): Promise<number> {
  if (ctxUser) return ctxUser.id;
  const demoId = await getDemoUserId();
  if (!demoId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return demoId;
}

export const settingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const userId = await effectiveUserId(ctx.user);
    const s = await getSettings(userId);
    if (!s) {
      return {
        notificationsEnabled: true,
        alertSensitivity: "medium" as const,
        shareDiagnosticData: false,
      };
    }
    return {
      notificationsEnabled: s.notifications_enabled,
      alertSensitivity: s.alert_sensitivity as "low" | "medium" | "high",
      shareDiagnosticData: !!s.share_diagnostic_data,
    };
  }),

  update: protectedProcedure
    .input(
      z.object({
        notificationsEnabled: z.boolean().optional(),
        alertSensitivity: z.enum(["low", "medium", "high"]).optional(),
        shareDiagnosticData: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      return upsertSettings(userId, input);
    }),
});
