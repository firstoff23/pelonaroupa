import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it, vi } from "vitest";
import {
  assertNotProductionSupabase,
  PROD_PROJECT_ID,
} from "./test-utils";

describe("Test Environment Security & Network Isolation", () => {
  it("env vars perigosas de produção estão bloqueadas (vazias) no ambiente de testes", () => {
    expect(process.env.SUPABASE_URL).toBe("");
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBe("");
    expect(process.env.VITE_SUPABASE_URL).toBe("");
    expect(process.env.VITE_SUPABASE_ANON_KEY).toBe("");
  });

  it("bloqueia e aborta se SUPABASE_TEST_URL apontar para o projeto de produção", () => {
    const testUrl = `https://${PROD_PROJECT_ID}.supabase.co`;

    expect(() => {
      assertNotProductionSupabase(testUrl);
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

  it("server/db.ts não contém referências a process.env.VITEST", () => {
    const dbSource = readFileSync(
      path.join(process.cwd(), "server/db.ts"),
      "utf-8",
    );
    expect(dbSource).not.toMatch(/process\.env\.VITEST/);
  });

  it("server/db.ts não contém referências a NODE_ENV === 'test'", () => {
    const dbSource = readFileSync(
      path.join(process.cwd(), "server/db.ts"),
      "utf-8",
    );
    expect(dbSource).not.toMatch(/NODE_ENV\s*===\s*["']test["']/);
  });
});
