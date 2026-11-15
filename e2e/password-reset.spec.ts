import { expect, test } from "@playwright/test";
import { NEW_PASSWORD_PATH, REQUEST_PASSWORD_RESET_PATH } from "@/lib/auth/routes";
import { createVerifiedCreator } from "./support/members";
import { latestEmailTo } from "./support/outbox";

test("a User who forgot their password is emailed a reset link", async ({ page }) => {
  const { email } = await createVerifiedCreator();

  await page.goto(REQUEST_PASSWORD_RESET_PATH);
  await page.getByLabel("E-post").fill(email);
  await page.getByRole("button", { name: "Skicka länk" }).click();
  await expect(page.getByText("har vi skickat en länk dit")).toBeVisible();

  const { links } = await latestEmailTo(email);
  expect(links.some((link) => new URL(link).pathname === NEW_PASSWORD_PATH)).toBe(true);
});
