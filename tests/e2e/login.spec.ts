import { expect, loginAsMockUser, test } from "./fixtures";

test.describe("login", () => {
  test("logs in with mocked email and password and redirects to dashboard", async ({
    page,
  }) => {
    await loginAsMockUser(page);

    await expect(page.getByText("Bobi").first()).toBeVisible();
    await page.goto("/definicoes");
    const logoutButton = page.getByRole("button", {
      name: /terminar sess|sign out/i,
    });
    await logoutButton.scrollIntoViewIfNeeded();
    await expect(logoutButton).toBeVisible();
  });
});
