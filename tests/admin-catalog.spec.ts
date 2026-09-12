import { test, expect, type Page, type Locator } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const config = JSON.parse(execFileSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "status", "-o", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
if (!["localhost", "127.0.0.1"].includes(new URL(config.API_URL).hostname)) throw new Error("Local tests only");
const credentials = JSON.parse(readFileSync(".local/review-access.json", "utf8"));
const prefix = `UI Sprint3 ${Date.now()}`;
let client: SupabaseClient;

test.beforeAll(async () => {
  client = createClient(config.API_URL, config.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
});

test.afterAll(async () => {
  const { data: products } = await client.from("products").select("id,product_images(storage_path)").like("title", `${prefix}%`);
  for (const product of products ?? []) {
    const images = product.product_images as unknown as { storage_path: string }[];
    if (images.length) await client.storage.from("product-images").remove(images.map(image => image.storage_path));
    const { error } = await client.from("products").delete().eq("id", product.id);
    if (error) throw error;
  }
  const { error } = await client.from("catalog_options").delete().like("name", `${prefix}%`);
  if (error) throw error;
});

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async route => {
    if (new URL(route.request().url()).hostname.endsWith("supabase.co")) throw new Error("Tests must not access production");
    await route.continue();
  });
  await page.goto("/admin/");
  await page.getByPlaceholder("Email admin").fill(credentials.email);
  await page.getByPlaceholder("Password", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Inventario editable" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Agregar disco", exact: true })).toBeEnabled();
});

async function addOption(page: Page, form: Locator, label: string, name: string) {
  const field = form.locator(".catalog-field").filter({ has: page.locator("label", { hasText: label }) });
  await field.getByRole("button", { name: "Agregar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre", { exact: true }).fill(name);
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
}

test("create, reload, edit, rename, deactivate, and display a disk with persisted metadata and image", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const form = page.getByRole("region", { name: "Nuevo disco", exact: true });
  const title = `${prefix} Disco`;
  const artist = `${prefix} Artista`;
  const label = `${prefix} Sello`;
  await expect(form.getByLabel("Album", { exact: true })).toHaveCount(0);
  await expect(form.getByLabel("Estado de tapa", { exact: true })).toHaveValue("");
  await expect(form.getByLabel("Estado de medio", { exact: true })).toHaveValue("");
  await expect(form.getByLabel("Destacado en el hero", { exact: true })).toBeVisible();
  await form.getByLabel("Título del disco", { exact: true }).fill(title);
  await addOption(page, form, "Nombre del artista", artist);
  await expect(form.getByLabel("Nombre del artista", { exact: true })).toHaveValue(artist);
  await addOption(page, form, "Label/Sello", label);
  await form.getByLabel("Género", { exact: true }).selectOption({ label: "Rock" });
  await form.getByLabel("Formato", { exact: true }).selectOption({ label: "LP" });
  const country = form.getByLabel("País", { exact: true });
  await country.fill("Arg");
  await country.press("ArrowDown");
  await country.press("Enter");
  await expect(country).toHaveValue("Argentina");
  await form.getByLabel("Estado de tapa", { exact: true }).selectOption({ label: "EX" });
  await form.getByLabel("Estado de medio", { exact: true }).selectOption({ label: "NM" });
  await form.getByLabel("Año", { exact: true }).selectOption("1975");
  await form.getByLabel("Precio", { exact: true }).fill("32000");
  await form.getByLabel("Imágenes", { exact: true }).setInputFiles(path.resolve("public/products/IMG_2273.jpg"));
  await expect(page.getByText("Imagen preparada", { exact: true }).first()).toBeVisible();
  await form.getByRole("button", { name: "Agregar disco", exact: true }).click();
  await expect(page.getByText("Disco agregado", { exact: true })).toBeVisible();
  await expect(form.getByLabel("Título del disco", { exact: true })).toHaveValue("");
  await page.reload();
  await page.getByPlaceholder("Buscar producto...").fill(title);
  // The title search scopes all subsequent operations to the newly created disk.
  const disk = page.locator(".admin-row");
  await expect(disk).toHaveCount(1);
  await expect(disk.getByLabel("Nombre del artista", { exact: true })).toHaveValue(artist);
  await expect(disk.getByLabel("Label/Sello", { exact: true })).toHaveValue(label);
  await expect(disk.getByLabel("País", { exact: true })).toHaveValue("Argentina");
  await expect(disk.getByLabel("Año", { exact: true })).toHaveValue("1975");
  const imageUrl = await disk.locator(".admin-cover img").getAttribute("src");
  expect(imageUrl).toContain("127.0.0.1:54321/storage/v1/object/public/product-images/");
  const { data: record, error } = await client.from("products").select().eq("title", title).single();
  expect(error).toBeNull();
  expect(record.format).toBe("LP"); expect(record.country).toBe("Argentina"); expect(record.label).toBe(label);
  await disk.getByLabel("Año", { exact: true }).selectOption("");
  await disk.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Cambios guardados", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Opciones del catálogo", exact: true }).click();
  await page.getByRole("button", { name: "Artistas", exact: true }).click();
  await page.getByLabel("Buscar opciones", { exact: true }).fill(artist);
  await page.getByRole("button", { name: `Editar ${artist}`, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre", { exact: true }).fill(`${artist} Revisado`);
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.locator(".catalog-option-list").getByRole("checkbox").uncheck();
  await expect(page.getByText("Opción desactivada", { exact: true })).toBeVisible();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: `Eliminar ${artist} Revisado`, exact: true }).click();
  await expect(page.getByRole("alert", { name: "Notificación" })).toContainText("está en uso");
  await page.getByRole("button", { name: "Discos", exact: true }).click();
  await form.getByLabel("Nombre del artista", { exact: true }).fill(prefix);
  await expect(form.getByRole("option", { name: `${artist} Revisado`, exact: true })).toHaveCount(0);
  await form.getByLabel("Nombre del artista", { exact: true }).press("Escape");
  await page.reload();
  await page.getByPlaceholder("Buscar producto...").fill(title);
  await expect(disk.getByLabel("Nombre del artista", { exact: true })).toHaveValue(`${artist} Revisado`);
  await disk.getByLabel("Precio", { exact: true }).fill("33000");
  await disk.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Cambios guardados", { exact: true })).toBeVisible();
  await page.goto(`/producto/?slug=${record.slug}`);
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await expect(page.locator(".detail-artist")).toHaveText(`${artist} Revisado`);
  await expect(page.locator(".detail-status-grid")).toContainText(label);
  await expect(page.locator(".detail-status-grid")).toContainText("LP");
  await page.goto("/");
  await page.locator(".product-card").filter({ hasText: title }).waitFor();
  expect(errors).toEqual([]);
});

test("inline errors preserve form data, duplicates are prevented, modal and admin fit mobile", async ({ page }) => {
  const form = page.getByRole("region", { name: "Nuevo disco", exact: true });
  await form.getByLabel("Título del disco", { exact: true }).fill(`${prefix} Pending`);
  await form.getByRole("button", { name: "Agregar disco", exact: true }).click();
  await expect(page.getByRole("alert", { name: "Notificación" })).toContainText("Seleccioná un artista");
  await page.getByRole("button", { name: "Opciones del catálogo", exact: true }).click();
  await page.getByRole("region", { name: "Opciones del catálogo", exact: true }).getByRole("button", { name: "Agregar", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre", { exact: true }).fill("  ROCK  ");
  await expect(dialog.getByRole("button", { name: "Guardar", exact: true })).toBeDisabled();
  await expect(dialog).toContainText("Ya existe");
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Discos", exact: true }).click();
  await expect(form.getByLabel("Título del disco", { exact: true })).toHaveValue(`${prefix} Pending`);
  await page.route("**/rest/v1/catalog_options*", async route => {
    if (route.request().method() === "POST") await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ code: "TEST_FAILURE", message: "Error de prueba controlado" }) });
    else await route.fallback();
  });
  await form.locator(".catalog-field").filter({ has: page.locator("label", { hasText: "Género" }) }).getByRole("button", { name: "Agregar", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre", { exact: true }).fill(`${prefix} Fallido`);
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Error de prueba controlado");
  await expect(dialog.getByLabel("Nombre", { exact: true })).toHaveValue(`${prefix} Fallido`);
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.screenshot({ path: ".local/admin-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: ".local/admin-mobile.png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await form.locator(".catalog-field").filter({ has: page.locator("label", { hasText: "Nombre del artista" }) }).getByRole("button", { name: "Agregar", exact: true }).click();
  await page.screenshot({ path: ".local/admin-mobile-dialog.png" });
  const bounds = await page.getByRole("dialog").boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar", exact: true }).click();
});

test("featured checkbox explains the five-product limit", async ({ page }) => {
  const original = await client.from("products").select("id,title,featured,featured_order").order("created_at");
  if (original.error) throw original.error;
  const candidates = original.data.slice(0, 6);
  expect(candidates).toHaveLength(6);

  try {
    const cleared = await client.from("products").update({ featured: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    if (cleared.error) throw cleared.error;
    for (const candidate of candidates.slice(0, 5)) {
      const featured = await client.from("products").update({ featured: true }).eq("id", candidate.id);
      if (featured.error) throw featured.error;
    }

    await page.reload();
    await expect(page.getByRole("heading", { name: "Inventario editable" })).toBeVisible();
    await page.getByPlaceholder("Buscar producto...").fill(candidates[5].title);
    const checkbox = page.locator(".admin-row").getByLabel("Destacado en el hero", { exact: true });
    await expect(checkbox).toBeEnabled();
    await checkbox.click();
    await expect(checkbox).not.toBeChecked();
    await expect(page.getByRole("alert", { name: "Notificación" })).toContainText("Ya hay 5 discos destacados");
  } finally {
    await client.from("products").update({ featured: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    for (const product of original.data.filter(product => product.featured)) {
      const restored = await client.from("products").update({ featured: true, featured_order: product.featured_order }).eq("id", product.id);
      if (restored.error) throw restored.error;
    }
  }
});
