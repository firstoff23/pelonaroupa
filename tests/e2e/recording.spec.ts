import { expect, loginAsMockUser, test } from "./fixtures";

test.describe("recording", () => {
  test("records mocked audio, classifies it, and shows the event in history", async ({
    page,
  }) => {
    test.setTimeout(45_000);

    await loginAsMockUser(page);
    await page.goto("/gravar");

    const recordButton = page.getByTestId("record-button");
    await expect(recordButton).toBeVisible();
    await recordButton.click();

    // Ensure the recording has started before waiting for its three-second review.
    await expect(page.getByText(/A gravar/i).first()).toBeVisible({
      timeout: 10_000,
    });

    // After 3s recording, the confirm button appears
    const confirmBtn = page
      .getByRole("button", { name: /Confirmar|Confirm/i })
      .first();
    await expect(confirmBtn).toBeVisible({ timeout: 10_000 });
    await confirmBtn.click();

    await expect(page.getByText(/92%/).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/yamnet-e2e/i).first()).toBeVisible();

    await page.goto("/historico");
    await expect(page.getByText(/92%/).first()).toBeVisible();
  });
});
