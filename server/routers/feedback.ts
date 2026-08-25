import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getFeedbackAnnotations,
  reviewFeedbackAnnotation,
  saveFeedbackAnnotation,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const ALLOWED_AUDIT_ROLES = ["admin", "vet", "veterinarian", "clinic_admin"];

async function effectiveUserId(ctxUser: { id: number } | null): Promise<number> {
  if (ctxUser) return ctxUser.id;
  const { getDemoUserId } = await import("../db");
  const demoId = await getDemoUserId();
  if (!demoId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return demoId;
}

export const feedbackRouter = router({
  submit: protectedProcedure
    .input(
      z.object({
        classificationEventId: z.number(),
        confirmedState: z.string().max(50),
        comment: z.string().max(500).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const accessToken = ctx.accessToken;
      if (!accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Token de acesso em falta na sessão",
        });
      }
      const userId = await effectiveUserId(ctx.user);
      const data = await saveFeedbackAnnotation(accessToken, userId, input);
      return { success: true, data };
    }),

  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(20),
          offset: z.number().min(0).default(0),
          animal_type: z.string().optional(),
          from: z.string().optional(),
          to: z.string().optional(),
          reviewed: z.enum(["all", "pending", "reviewed"]).default("all"),
          predicted_state: z
            .enum([
              "distress",
              "attention",
              "excitement",
              "hunger",
              "alert",
              "relaxed",
            ])
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const accessToken = ctx.accessToken;
      if (!accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Token de acesso em falta na sessão",
        });
      }
      if (!ALLOWED_AUDIT_ROLES.includes(ctx.user?.role || "")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Acesso restrito a utilizadores com role veterinária ou administrativa.",
        });
      }
      const data = await getFeedbackAnnotations(accessToken, input);
      return data;
    }),

  review: protectedProcedure
    .input(
      z.object({
        feedbackId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const accessToken = ctx.accessToken;
      if (!accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Token de acesso em falta na sessão",
        });
      }
      if (!ALLOWED_AUDIT_ROLES.includes(ctx.user?.role || "")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Acesso restrito a utilizadores com role veterinária ou administrativa.",
        });
      }
      const userId = await effectiveUserId(ctx.user);
      const data = await reviewFeedbackAnnotation(
        accessToken,
        userId,
        input.feedbackId,
      );
      return { success: true, data };
    }),
});
