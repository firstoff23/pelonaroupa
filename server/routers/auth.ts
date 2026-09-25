import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "../_core/cookies";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getSupabase, updateUser } from "../db";
import { effectiveUserId } from "../lib/authHelpers";
import { validateTotp } from "../lib/totp";
import { validatePasswordNotPwned } from "../security/check-password-pwned";

export const authRouter = router({
  me: publicProcedure.query((opts) => opts.ctx.user),

  checkPasswordPwned: publicProcedure
    .input(
      z.object({
        password: z.string().min(1).max(256),
      }),
    )
    .mutation(async ({ input }) => {
      const pwnedMessage = await validatePasswordNotPwned(input.password);
      return {
        isPwned: Boolean(pwnedMessage),
        message: pwnedMessage,
      };
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),

  updateProfile: protectedProcedure
    .input(
      z
        .object({
          name: z.string().min(1).max(100).optional(),
          email: z.string().email().optional(),
        })
        .strict(),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      await updateUser(userId, input);
      return { success: true };
    }),

  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = await effectiveUserId(ctx.user);
    await updateUser(userId, { onboardingCompleted: true });
    return { success: true };
  }),

  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = await effectiveUserId(ctx.user);
    const openId = ctx.user.openId;

    const supabase = getSupabase();

    // 1. Get all events with audio_url for this user to delete from storage
    const { data: events, error: eventsError } = await supabase
      .from("classification_events")
      .select("audio_url")
      .eq("user_id", userId);

    if (eventsError) {
      console.error(
        "[DeleteAccount] Error fetching user events for audio deletion:",
        eventsError,
      );
    }

    const fileNames = (events || [])
      .map((e: any) => e.audio_url)
      .filter((url: any): url is string =>
        Boolean(url && url.includes("audio-recordings/")),
      )
      .map((url: string) => url.split("audio-recordings/").pop() as string);

    if (fileNames.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("audio-recordings")
        .remove(fileNames);
      if (storageError) {
        console.error(
          "[DeleteAccount] Error removing audio files from storage:",
          storageError,
        );
      } else {
        console.log(
          `[DeleteAccount] Successfully removed ${fileNames.length} audio files from storage.`,
        );
      }
    }

    // 2. Delete from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(openId);
    if (authError) {
      console.error(
        "[DeleteAccount] Error deleting user from Supabase Auth:",
        authError,
      );
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Erro ao eliminar utilizador no Supabase Auth: ${authError.message}`,
      });
    }

    // 3. Delete from public.users table (cascades to all other tables)
    const { error: dbError } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);

    if (dbError) {
      console.error(
        "[DeleteAccount] Error deleting user from database:",
        dbError,
      );
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Erro ao eliminar dados do utilizador na base de dados: ${dbError.message}`,
      });
    }

    // 4. Clear session cookies (logout)
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });

    return { success: true };
  }),

  // ── MFA / TOTP ─────────────────────────────────────────────────────────────
  "mfa.setup": protectedProcedure.mutation(async ({ ctx }) => {
    const userId = await effectiveUserId(ctx.user);
    const supabase = getSupabase();

    const secretBytes = crypto.getRandomValues(new Uint8Array(20));
    const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";
    for (let i = 0; i < secretBytes.length; ) {
      const b0 = secretBytes[i++] ?? 0;
      const b1 = secretBytes[i++] ?? 0;
      const b2 = secretBytes[i++] ?? 0;
      const b3 = secretBytes[i++] ?? 0;
      const b4 = secretBytes[i++] ?? 0;
      secret += BASE32_CHARS[(b0 >> 3) & 31];
      secret += BASE32_CHARS[((b0 << 2) | (b1 >> 6)) & 31];
      secret += BASE32_CHARS[(b1 >> 1) & 31];
      secret += BASE32_CHARS[((b1 << 4) | (b2 >> 4)) & 31];
      secret += BASE32_CHARS[((b2 << 1) | (b3 >> 7)) & 31];
      secret += BASE32_CHARS[(b3 >> 2) & 31];
      secret += BASE32_CHARS[((b3 << 3) | (b4 >> 5)) & 31];
      secret += BASE32_CHARS[b4 & 31];
    }

    const { error } = await supabase
      .from("users")
      .update({ mfa_secret: secret, mfa_enabled: false })
      .eq("id", userId);

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Erro ao guardar segredo MFA: ${error.message}`,
      });
    }

    const email = ctx.user.email ?? `user-${userId}@pelonaroupa`;
    const issuer = "AnimalMind";
    const otpAuthUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

    return { secret, otpAuthUri };
  }),

  "mfa.verify": protectedProcedure
    .input(
      z.object({
        code: z
          .string()
          .length(6)
          .regex(/^\d{6}$/),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await effectiveUserId(ctx.user);
      const supabase = getSupabase();

      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("mfa_secret")
        .eq("id", userId)
        .single();

      if (fetchError || !userData?.mfa_secret) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "MFA não configurado. Inicia o setup primeiro.",
        });
      }

      const isValid = validateTotp(userData.mfa_secret, input.code);
      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Código inválido ou expirado.",
        });
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({ mfa_enabled: true })
        .eq("id", userId);

      if (updateError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao ativar MFA: ${updateError.message}`,
        });
      }

      return { success: true };
    }),

  "mfa.disable": protectedProcedure.mutation(async ({ ctx }) => {
    const userId = await effectiveUserId(ctx.user);
    const supabase = getSupabase();

    const { error } = await supabase
      .from("users")
      .update({ mfa_secret: null, mfa_enabled: false })
      .eq("id", userId);

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Erro ao desativar MFA: ${error.message}`,
      });
    }

    return { success: true };
  }),

  "mfa.status": protectedProcedure.query(async ({ ctx }) => {
    const userId = await effectiveUserId(ctx.user);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("users")
      .select("mfa_enabled")
      .eq("id", userId)
      .single();

    if (error) {
      return { enabled: false };
    }

    return { enabled: Boolean(data?.mfa_enabled) };
  }),
});
