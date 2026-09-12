import { expect, test } from "@playwright/test";

test("browser extension attributes on body do not report a hydration mismatch", async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on("console", message => {
    if (message.type() === "error" && message.text().includes("hydrated but some attributes")) {
      hydrationErrors.push(message.text());
    }
  });

  await page.route("**/admin/", async route => {
    const response = await route.fetch();
    const html = (await response.text()).replace(
      "<body>",
      '<body data-new-gr-c-s-check-loaded="14.1295.0" data-gr-ext-installed="">'
    );
    await route.fulfill({ response, body: html });
  });

  await page.goto("/admin/");
  await expect(page.getByRole("heading", { name: "Ingresar a LADO A DISCOS" })).toBeVisible();
  await page.waitForTimeout(500);
  expect(hydrationErrors).toEqual([]);
});
