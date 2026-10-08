import { expect, test } from "@playwright/test";

async function dismissConsent(page: import("@playwright/test").Page) {
  const reject = page.getByRole("button", { name: "Rechazar", exact: true });
  if (await reject.count()) await reject.click();
}

test("adding from a product detail persists to the catalog and after reload", async ({ page }) => {
  await page.goto("/producto/vinilo-12-pulgadas-001/");
  await page.getByRole("button", { name: "Agregar al carrito", exact: true }).click();
  await expect(page.getByRole("button", { name: "En carrito", exact: true })).toBeDisabled();

  await page.goto("/");
  await dismissConsent(page);
  const cart = page.getByRole("button", { name: "Abrir carrito", exact: true });
  await expect(cart).toContainText("1");
  await page.reload();
  await expect(cart).toContainText("1");
});

test("adding from the catalog survives a refresh", async ({ page }) => {
  await page.goto("/");
  await dismissConsent(page);
  await page.getByRole("button", { name: "Agregar", exact: true }).first().click();
  const cart = page.getByRole("button", { name: "Abrir carrito", exact: true });
  await expect(cart).toContainText("1");
  await page.reload();
  await expect(cart).toContainText("1");
});

test("the cart inquiry creates one concise message with availability and product links", async ({ page }) => {
  await page.goto("/");
  await dismissConsent(page);
  await page.getByRole("button", { name: "Agregar", exact: true }).first().click();
  const inquiry = page.getByRole("link", { name: "Pedir por WhatsApp", exact: true });
  const message = new URL((await inquiry.getAttribute("href"))!).searchParams.get("text")!;

  expect(message).toMatch(/^Hola Charly, quiero consultar por estos discos:/);
  expect(message).toContain("Disponibilidad: En stock");
  expect(message).toContain("Precio: $");
  expect(message).toContain("Link/Producto: http://localhost:3000/producto/");
  expect(message).toContain("Total estimado: $");
  expect(message).not.toContain("Estado: disco");
  expect(message.match(/Hola Charly/g)).toHaveLength(1);
});
