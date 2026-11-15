import { expect, test } from "@playwright/test";
import { groupPath, groupSetListsPath } from "@/lib/groups/routes";
import { createVerifiedCreator } from "./support/members";

test("an anonymous visitor to a Group is sent to login and lands back in the Group after signing in", async ({
  page,
}) => {
  const { email, password, groupSlug } = await createVerifiedCreator();

  await page.goto(groupPath(groupSlug));

  await expect(page).toHaveURL(
    (url) =>
      url.pathname === "/auth/login" && url.searchParams.get("next") === groupPath(groupSlug),
  );

  await page.getByLabel("E-post").fill(email);
  await page.getByLabel("Lösenord").fill(password);
  await page.getByRole("button", { name: "Logga in" }).click();

  await expect(page).toHaveURL((url) => url.pathname === groupSetListsPath(groupSlug));
  await expect(page.getByRole("heading", { name: "Repertoarer" })).toBeVisible();
});
