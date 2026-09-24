import { TRPCError } from "@trpc/server";
import { getDemoUserId } from "../db";

/**
 * Resolves the effective user ID from the tRPC context.
 * If the user is authenticated, returns their ID.
 * Otherwise, falls back to the configured demo user ID or throws UNAUTHORIZED.
 */
export async function effectiveUserId(
  ctxUser: { id: number } | null | undefined,
): Promise<number> {
  if (ctxUser) return ctxUser.id;
  const demoId = await getDemoUserId();
  if (!demoId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Utilizador não autenticado.",
    });
  }
  return demoId;
}
