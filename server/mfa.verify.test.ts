import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import * as dbModule from "./db";
import { generateTotp } from "./lib/totp";
import { appRouter } from "./routers";

// Test TOTP Secret: standard RFC 3548 Base32 secret
const TEST_SECRET = "JBSWY3DPEHPK3PXP";

describe("auth.mfa.verify Unit Tests (with mock DB)", () => {
  let mockUserData: {
    mfa_secret: string;
    mfa_failed_attempts: number;
    mfa_locked_until: string | null;
  };

  let updateMock: any;

  beforeEach(() => {
    mockUserData = {
      mfa_secret: TEST_SECRET,
      mfa_failed_attempts: 0,
      mfa_locked_until: null,
    };

    updateMock = vi.fn().mockImplementation((updates: any) => {
      if ("mfa_failed_attempts" in updates) {
        mockUserData.mfa_failed_attempts = updates.mfa_failed_attempts;
      }
      if ("mfa_locked_until" in updates) {
        mockUserData.mfa_locked_until = updates.mfa_locked_until;
      }
      return {
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(() =>
              Promise.resolve({
                data: { ...mockUserData },
                error: null,
              }),
            ),
          }),
        }),
        update: updateMock,
      }),
    };

    vi.spyOn(dbModule, "getSupabase").mockReturnValue(mockSupabase as any);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  function createCaller() {
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "test-user-id",
        email: "test@example.com",
        name: "Test User",
        loginMethod: "email",
        role: "owner",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
        onboardingCompleted: true,
      },
      req: {} as any,
      res: {} as any,
    };
    return appRouter.createCaller(ctx);
  }

  it("mfa.verify com 5 falhas consecutivas bloqueia a conta com TOO_MANY_REQUESTS", async () => {
    const caller = createCaller();

    // 4 falhas consecutivas retornam BAD_REQUEST
    for (let i = 1; i <= 4; i++) {
      await expect(
        caller.auth["mfa.verify"]({ code: "000000" }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
      expect(mockUserData.mfa_failed_attempts).toBe(i);
    }

    // A 5ª tentativa falhada bloqueia a conta e retorna TOO_MANY_REQUESTS
    await expect(
      caller.auth["mfa.verify"]({ code: "000000" }),
    ).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
      message: expect.stringContaining("Demasiadas tentativas"),
    });

    expect(mockUserData.mfa_locked_until).not.toBeNull();
    expect(mockUserData.mfa_failed_attempts).toBe(0);

    // A 6ª tentativa também é bloqueada por conta bloqueada (mesmo com código dinâmico válido)
    const validCode = generateTotp(TEST_SECRET, Date.now());
    await expect(
      caller.auth["mfa.verify"]({ code: validCode }),
    ).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
      message: expect.stringContaining("bloqueada temporariamente"),
    });
  });

  it("mfa.verify com sucesso faz reset de mfa_failed_attempts para 0 e ativa MFA", async () => {
    const caller = createCaller();
    mockUserData.mfa_failed_attempts = 3;

    // Gerado dinamicamente para o segredo do utilizador
    const validCode = generateTotp(TEST_SECRET, Date.now());
    const res = await caller.auth["mfa.verify"]({ code: validCode });
    expect(res).toEqual({ success: true, ok: true });
    expect(mockUserData.mfa_failed_attempts).toBe(0);
    expect(mockUserData.mfa_locked_until).toBeNull();
  });

  it("mfa.verify com conta bloqueada lanca TOO_MANY_REQUESTS mesmo com codigo gerado dinamicamente", async () => {
    const caller = createCaller();
    // Bloqueado até daqui a 10 minutos
    mockUserData.mfa_locked_until = new Date(
      Date.now() + 10 * 60 * 1000,
    ).toISOString();

    const validCode = generateTotp(TEST_SECRET, Date.now());
    await expect(
      caller.auth["mfa.verify"]({ code: validCode }),
    ).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
      message: expect.stringContaining("Conta bloqueada temporariamente"),
    });
  });
});

// Este bloco só corre quando explicitamente configurado com SUPABASE_TEST_URL e SUPABASE_TEST_SERVICE_ROLE_KEY.
// Em pnpm test comum ou em CI por omissão, é ignorado garantindo que NUNCA toca na BD de produção.
const PROD_PROJECT_ID = "yuzqxrmtbqlnalpjehno";
if (process.env.SUPABASE_TEST_URL?.includes(PROD_PROJECT_ID)) {
  throw new Error(
    `[ABORT] Testes de integração apontam para PRODUÇÃO. Remover SUPABASE_TEST_URL.`
  );
}

describe.skipIf(!process.env.SUPABASE_TEST_URL)(
  "auth.mfa.verify Integration Tests (Staging)",
  () => {
    let supabase: ReturnType<typeof createClient>;
    let credentialsValid = false;
    let integrationUserId: number | null = null;

    beforeEach(async () => {
      vi.restoreAllMocks();
      const url = process.env.SUPABASE_TEST_URL;
      const key = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
      if (!url || !key) return;

      try {
        supabase = createClient(url, key);
        const { error } = await supabase.from("users").select("id").limit(1);
        credentialsValid = !error;
        if (!credentialsValid) return;

        const { data: u, error: upsertErr } = await supabase
          .from("users")
          .upsert(
            {
              open_id: "test-mfa-integration-user",
              email: "mfa-integration@animalmind.local",
              name: "MFA Integration Test",
              mfa_secret: TEST_SECRET,
              mfa_failed_attempts: 0,
              mfa_locked_until: null,
            },
            { onConflict: "open_id" },
          )
          .select("id")
          .single();

        if (upsertErr || !u) {
          console.error("Failed to seed integration user:", upsertErr);
          credentialsValid = false;
          return;
        }
        integrationUserId = u.id;
      } catch {
        credentialsValid = false;
      }
    });

    afterAll(async () => {
      if (credentialsValid && integrationUserId && supabase) {
        await supabase
          .from("users")
          .delete()
          .eq("id", integrationUserId);
      }
    });

    function createIntegrationCaller(userId: number) {
      const ctx: TrpcContext = {
        user: {
          id: userId,
          openId: "test-mfa-integration-user",
          email: "mfa-integration@animalmind.local",
          name: "MFA Integration Test",
          loginMethod: "email",
          role: "owner",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
          onboardingCompleted: true,
        },
        req: {} as any,
        res: {} as any,
      };
      return appRouter.createCaller(ctx);
    }

    it("Rate-limit incrementa mfa_failed_attempts na BD de staging", async () => {
      if (!credentialsValid || !integrationUserId) return;

      await supabase
        .from("users")
        .update({ mfa_failed_attempts: 0, mfa_locked_until: null })
        .eq("id", integrationUserId);

      const caller = createIntegrationCaller(integrationUserId);

      await expect(
        caller.auth["mfa.verify"]({ code: "000000" }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });

      const { data: dbUser } = await supabase
        .from("users")
        .select("mfa_failed_attempts, mfa_locked_until")
        .eq("id", integrationUserId)
        .single();

      expect(dbUser?.mfa_failed_attempts).toBe(1);
      expect(dbUser?.mfa_locked_until).toBeNull();
    });

    it("5ª falha seta mfa_locked_until a +15min na BD de staging", async () => {
      if (!credentialsValid || !integrationUserId) return;

      await supabase
        .from("users")
        .update({ mfa_failed_attempts: 4, mfa_locked_until: null })
        .eq("id", integrationUserId);

      const caller = createIntegrationCaller(integrationUserId);

      await expect(
        caller.auth["mfa.verify"]({ code: "000000" }),
      ).rejects.toMatchObject({
        code: "TOO_MANY_REQUESTS",
        message: expect.stringContaining("Demasiadas tentativas"),
      });

      const { data: dbUser } = await supabase
        .from("users")
        .select("mfa_failed_attempts, mfa_locked_until")
        .eq("id", integrationUserId)
        .single();

      expect(dbUser?.mfa_failed_attempts).toBe(0);
      expect(dbUser?.mfa_locked_until).not.toBeNull();

      const lockedUntil = new Date(dbUser!.mfa_locked_until!).getTime();
      expect(lockedUntil).toBeGreaterThan(Date.now() + 14 * 60 * 1000);
      expect(lockedUntil).toBeLessThanOrEqual(Date.now() + 16 * 60 * 1000);
    });

    it("Sucesso faz reset de mfa_failed_attempts para 0 e mfa_locked_until para null com TOTP gerado dinamicamente", async () => {
      if (!credentialsValid || !integrationUserId) return;

      await supabase
        .from("users")
        .update({
          mfa_failed_attempts: 3,
          mfa_locked_until: null,
          mfa_enabled: false,
        })
        .eq("id", integrationUserId);

      const caller = createIntegrationCaller(integrationUserId);

      // Gerado dinamicamente para o timestamp atual
      const dynamicCode = generateTotp(TEST_SECRET, Date.now());

      const result = await caller.auth["mfa.verify"]({ code: dynamicCode });
      expect(result).toEqual({ success: true, ok: true });

      const { data: dbUser } = await supabase
        .from("users")
        .select("mfa_failed_attempts, mfa_locked_until, mfa_enabled")
        .eq("id", integrationUserId)
        .single();

      expect(dbUser?.mfa_failed_attempts).toBe(0);
      expect(dbUser?.mfa_locked_until).toBeNull();
      expect(dbUser?.mfa_enabled).toBe(true);
    });
  },
);
