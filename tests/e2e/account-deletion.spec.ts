import { expect, loginAsMockUser, test } from "./fixtures";

test.describe("Account Deletion", () => {
  test("can delete account and get redirected", async ({ page }) => {
    test.setTimeout(45_000);
    await loginAsMockUser(page);

    await page.goto("/definicoes");

    // Open the danger-zone confirmation dialog.
    const deleteAccountButton = page.getByRole("button", {
      name: /^Apagar Conta$|^Delete Account$/i,
    });
    await deleteAccountButton.scrollIntoViewIfNeeded();
    await deleteAccountButton.click();

    // The current flow has one final confirmation; the mutation then signs out.
    const confirmButton = page.getByRole("button", {
      name: /^Apagar conta$|^Delete account$/i,
    });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect(page).toHaveURL(/\/login$/);
  });
});
