import { expect, loginAsMockUser, test } from "./fixtures";

test.describe("Visual Classification", () => {
  test("capture image, classify, and show results", async ({ page }) => {
    test.setTimeout(45_000);

    await loginAsMockUser(page);

    await page.goto("/camera");

    // E2E builds expose a deterministic image instead of opening a physical camera.
    const openCameraButton = page.getByRole("button", {
      name: /Abrir Câmara \/ Galeria|Open Camera \/ Gallery/i,
    });
    await expect(openCameraButton).toBeVisible();
    await openCameraButton.click();

    // The deterministic image is now available for review.
    const confirmBtn = page
      .getByRole("button", { name: /Confirmar|Confirm/i })
      .first();
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // Wait for mock result
    await expect(page.getByText(/92%/).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/RELAX/i).first()).toBeVisible();
  });
});
