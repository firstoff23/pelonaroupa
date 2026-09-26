import path from "node:path";
import { expect, setMockMfa, setupPageMocks, test } from "./fixtures";

test.describe.configure({ mode: "serial" });

const SCREENSHOTS_DIR = path.resolve(
  process.cwd(),
  "docs",
  "audit-screenshots",
  "mfa",
);

test.describe("MFA Login Flow", () => {
  const mockUserEmail = "tutor.e2e@example.test";
  const mockUserPassword = "password-e2e";

  test("1. Login sem MFA -> dashboard direto", async ({ page }) => {
    // Default fixtures return mfa.status = { enabled: false }
    await page.goto("/login");
    await page.locator("#login-email").fill(mockUserEmail);
    await page.locator("#login-password").fill(mockUserPassword);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("Bobi").first()).toBeVisible();
  });

  test("2. Login com MFA ativo -> bloqueado no desafio TOTP", async ({
    page,
  }) => {
    setMockMfa({ enabled: true });

    await page.goto("/login");
    await page.locator("#login-email").fill(mockUserEmail);
    await page.locator("#login-password").fill(mockUserPassword);
    await page.getByRole("button", { name: "Entrar" }).click();

    const mfaChallenge = page.locator('[data-testid="mfa-challenge"]');
    const mfaInput = page.locator('[data-testid="mfa-input"]');

    await expect(mfaChallenge).toBeVisible();
    await expect(mfaInput).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("3. Codigo TOTP valido -> entra", async ({ page }) => {
    setMockMfa({ enabled: true });

    await page.goto("/login");
    await page.locator("#login-email").fill(mockUserEmail);
    await page.locator("#login-password").fill(mockUserPassword);
    await page.getByRole("button", { name: "Entrar" }).click();

    const mfaInput = page.locator('[data-testid="mfa-input"]');
    const mfaSubmit = page.locator('[data-testid="mfa-submit"]');

    await expect(mfaInput).toBeVisible();
    await mfaInput.fill("123456");
    await mfaSubmit.click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("4. Codigo TOTP invalido -> mantem no desafio + erro", async ({
    page,
  }) => {
    setMockMfa({
      enabled: true,
      verifyError: "Código inválido ou expirado.",
    });

    await page.goto("/login");
    await page.locator("#login-email").fill(mockUserEmail);
    await page.locator("#login-password").fill(mockUserPassword);
    await page.getByRole("button", { name: "Entrar" }).click();

    const mfaInput = page.locator('[data-testid="mfa-input"]');
    const mfaSubmit = page.locator('[data-testid="mfa-submit"]');

    await expect(mfaInput).toBeVisible();
    await mfaInput.fill("000000");
    await mfaSubmit.click();

    const mfaError = page.locator('[data-testid="mfa-error"]');
    await expect(mfaError).toBeVisible();
    await expect(mfaInput).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("5. Cancelar -> sessao invalidada (getSession() === null)", async ({
    page,
  }) => {
    setMockMfa({ enabled: true });

    await page.goto("/login");
    await page.locator("#login-email").fill(mockUserEmail);
    await page.locator("#login-password").fill(mockUserPassword);
    await page.getByRole("button", { name: "Entrar" }).click();

    const mfaCancel = page.locator('[data-testid="mfa-cancel"]');
    await expect(mfaCancel).toBeVisible();
    await mfaCancel.click();

    // After cancel, form returns to email/password
    await expect(page.locator("#login-email")).toBeVisible();

    // Check that session is cleared
    const hasSession = await page.evaluate(async () => {
      return Object.keys(localStorage).some(
        (key) => key.includes("auth-token") && localStorage.getItem(key),
      );
    });

    expect(hasSession).toBe(false);
  });

  test("6. Reload no desafio -> mantem no desafio", async ({ page }) => {
    setMockMfa({ enabled: true });

    await page.goto("/login");
    await page.locator("#login-email").fill(mockUserEmail);
    await page.locator("#login-password").fill(mockUserPassword);
    await page.getByRole("button", { name: "Entrar" }).click();

    const mfaChallenge = page.locator('[data-testid="mfa-challenge"]');
    await expect(mfaChallenge).toBeVisible();

    // Reload page during challenge
    await page.reload();

    // Must stay at 2FA challenge
    await expect(mfaChallenge).toBeVisible({ timeout: 10000 });

    // Capture proof screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "06-reload-challenge.png"),
      fullPage: true,
    });
  });

  test("7. 5 tentativas invalidas -> signOut + mensagem", async ({ page }) => {
    setMockMfa({
      enabled: true,
      verifyError: "Código inválido ou expirado.",
    });

    await page.goto("/login");
    await page.locator("#login-email").fill(mockUserEmail);
    await page.locator("#login-password").fill(mockUserPassword);
    await page.getByRole("button", { name: "Entrar" }).click();

    const mfaInput = page.locator('[data-testid="mfa-input"]');
    const mfaSubmit = page.locator('[data-testid="mfa-submit"]');
    await expect(mfaInput).toBeVisible();

    // Submit 5 invalid codes
    for (let attempt = 1; attempt <= 5; attempt++) {
      await mfaInput.fill("000000");
      await mfaSubmit.click();
      await page.waitForTimeout(300);
    }

    // After 5 attempts, client forces sign out and shows message
    await expect(page.locator("#login-email")).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText(/Demasiadas tentativas/i).first(),
    ).toBeVisible();

    // Verify session is invalidated
    const hasSession = await page.evaluate(async () => {
      return Object.keys(localStorage).some(
        (key) => key.includes("auth-token") && localStorage.getItem(key),
      );
    });
    expect(hasSession).toBe(false);

    // Capture proof screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "07-rate-limit-lockout.png"),
      fullPage: true,
    });
  });

  test("8. URL direta /dashboard com sessao pendente -> redireciona para /login?challenge=mfa", async ({
    page,
  }) => {
    setMockMfa({ enabled: true });

    // 1. Initial login with MFA enabled
    await page.goto("/login");
    await page.locator("#login-email").fill(mockUserEmail);
    await page.locator("#login-password").fill(mockUserPassword);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.locator('[data-testid="mfa-challenge"]')).toBeVisible();

    // 2. Try navigating directly to protected dashboard via URL without completing MFA
    await page.goto("/dashboard");

    // 3. ProtectedRoute must intercept and redirect to /login?challenge=mfa
    await expect(page).toHaveURL(/\/login\?challenge=mfa$/);
    await expect(page.locator('[data-testid="mfa-challenge"]')).toBeVisible();

    // Capture proof screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "08-direct-url-blocked.png"),
      fullPage: true,
    });
  });

  test("9. Nova aba com sessao pendente -> redireciona para desafio", async ({
    context,
    page,
  }) => {
    setMockMfa({ enabled: true });

    // 1. Log in on first page
    await page.goto("/login");
    await page.locator("#login-email").fill(mockUserEmail);
    await page.locator("#login-password").fill(mockUserPassword);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.locator('[data-testid="mfa-challenge"]')).toBeVisible();

    // 2. Open a new tab in the same browser context
    const newPage = await context.newPage();
    await setupPageMocks(newPage);

    // 3. Attempt to access dashboard in new tab
    await newPage.goto("/dashboard");

    // 4. In the new tab, sessionStorage is empty, so ProtectedRoute checks server and redirects to challenge
    await expect(newPage).toHaveURL(/\/login\?challenge=mfa$/);
    await expect(newPage.locator('[data-testid="mfa-challenge"]')).toBeVisible();

    await newPage.close();
  });
});
