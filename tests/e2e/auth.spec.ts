import { expect, loginAsMockUser, test } from "./fixtures";

test.describe("Auth flows", () => {
  test("user can login and logout successfully", async ({ page }) => {
    // Uses the login fixture
    await loginAsMockUser(page);

    await expect(page.getByText("Bobi").first()).toBeVisible();

    // Navigate to settings to logout
    await page.goto("/definicoes");

    // Click logout
    const logoutBtn = page.getByRole("button", {
      name: /terminar sess|sign out/i,
    });
    await logoutBtn.scrollIntoViewIfNeeded();
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Verify redirect to login or landing page
    await expect(page).toHaveURL(/(\/login|\/)/);
  });

  test("user can register a new account", async ({ page }) => {
    // Override auth checks to simulate logged out user
    await page.route(
      "https://test.supabase.co/**/auth/v1/user",
      async (route) => {
        await route.fulfill({ status: 401, body: "{}" });
      },
    );
    await page.route(
      "https://test.supabase.co/**/auth/v1/signup",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              id: "e2e-user-id",
              aud: "authenticated",
              role: "authenticated",
              email: "newuser.e2e@example.test",
              email_confirmed_at: null,
              phone: "",
              confirmed_at: null,
              last_sign_in_at: null,
              app_metadata: {
                provider: "email",
                providers: ["email"],
              },
              user_metadata: {
                full_name: "New E2E User",
              },
              identities: [
                {
                  identity_id: "e2e-identity-id",
                  id: "e2e-identity-id",
                  user_id: "e2e-user-id",
                  identity_data: {
                    email: "newuser.e2e@example.test",
                  },
                  provider: "email",
                },
              ],
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z",
              is_anonymous: false,
            },
            session: null,
          }),
        });
      },
    );

    await page.goto("/register");

    await page.locator("#register-name").fill("New E2E User");
    await page.locator("#register-email").fill("newuser.e2e@example.test");
    await page.locator("#register-password").fill("Password-e2e!");

    // Accept age gate
    await page.locator("#register-age-gate").click();

    // Click register
    await page.getByRole("button", { name: /^Criar conta/i }).click();

    // Verify it proceeds to the email-verification flow
    await expect(page).toHaveURL(/\/verify-otp\?email=/);
  });
});
