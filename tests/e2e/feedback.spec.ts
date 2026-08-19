import { expect, loginAsMockUser, test } from "./fixtures";

test.describe("Feedback", () => {
  test("submits feedback for a recent event", async ({ page }) => {
    test.setTimeout(45_000);
    await loginAsMockUser(page);

    await page.goto("/gravar");
    const recordButton = page.getByTestId("record-button");
    await expect(recordButton).toBeVisible();
    await recordButton.click();
    await expect(page.getByText(/A gravar/i).first()).toBeVisible({
      timeout: 10_000,
    });

    // After three seconds, the review confirmation appears.
    const confirmBtn = page
      .getByRole("button", { name: /Confirmar|Confirm/i })
      .first();
    await expect(confirmBtn).toBeVisible({ timeout: 10_000 });
    await confirmBtn.click();

    // Wait for event to be generated and form to appear
    await expect(page.getByText(/92%/).first()).toBeVisible({
      timeout: 15_000,
    });

    // Open detailed feedback form
    await page
      .getByRole("button", {
        name: /Confirmar \/ Corrigir Detalhes|Confirm \/ Correct Details/i,
      })
      .click();
    await page
      .locator("#feedback-comment-input")
      .fill("Descreve o comportamento");

    // Click submit
    await page
      .getByRole("button", { name: /Submeter Feedback|Submit Feedback/i })
      .click();

    // The successful mutation closes the correction form.
    await expect(page.locator("#feedback-comment-input")).toBeHidden({
      timeout: 15_000,
    });
  });
});
