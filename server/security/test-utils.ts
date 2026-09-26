export const PROD_PROJECT_ID = "yuzqxrmtbqlnalpjehno";

/**
 * Asserts that the test URL does not point to the production Supabase project.
 * Throws an [ABORT] error if production project ID is detected.
 */
export function assertNotProductionSupabase(testUrl?: string | null): void {
  if (testUrl?.includes(PROD_PROJECT_ID)) {
    throw new Error(
      `[ABORT] Testes de integração apontam para PRODUÇÃO. Remover SUPABASE_TEST_URL.`,
    );
  }
}
