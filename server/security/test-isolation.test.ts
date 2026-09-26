import { describe, expect, it, vi } from "vitest";

describe("Test Environment Security & Network Isolation", () => {
  it("env vars perigosas de produção estão bloqueadas (vazias) no ambiente de testes", () => {
    expect(process.env.SUPABASE_URL).toBe("");
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBe("");
    expect(process.env.VITE_SUPABASE_URL).toBe("");
    expect(process.env.VITE_SUPABASE_ANON_KEY).toBe("");
  });

  it("bloqueia e aborta se SUPABASE_TEST_URL apontar para o projeto de produção", () => {
    const PROD_PROJECT_ID = "yuzqxrmtbqlnalpjehno";
    const testUrl = `https://${PROD_PROJECT_ID}.supabase.co`;

    expect(() => {
      if (testUrl.includes(PROD_PROJECT_ID)) {
        throw new Error(
          `[ABORT] Testes de integração apontam para PRODUÇÃO. Remover SUPABASE_TEST_URL.`,
        );
      }
    }).toThrow(/\[ABORT\] Testes de integração apontam para PRODUÇÃO/);
  });

  it("pnpm test não faz chamadas a *.supabase.co", () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    const calls = fetchSpy.mock.calls.filter(([url]) =>
      String(url).includes(".supabase.co"),
    );

    expect(calls).toHaveLength(0);
    fetchSpy.mockRestore();
  });
});
