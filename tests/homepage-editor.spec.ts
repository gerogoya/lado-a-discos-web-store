import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const config = JSON.parse(execFileSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "status", "-o", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
if (!["localhost", "127.0.0.1"].includes(new URL(config.API_URL).hostname)) throw new Error("Local tests only");
const credentials = JSON.parse(readFileSync(".local/review-access.json", "utf8"));
const prefix = `Hero Sprint3 ${Date.now()}`;
let client: SupabaseClient;
let originalContent: Record<string, unknown>;
let originalSections: Record<string, unknown>[];
let originalFeatured: Array<{ id: string; featured: boolean; featured_order: number | null }>;
let featuredProducts: Array<{ id: string; title: string; artist: string }>;

test.beforeAll(async () => {
  client = createClient(config.API_URL, config.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const content = await client.from("homepage_content").select().eq("id", true).single();
  const sections = await client.from("homepage_sections").select().order("sort_order");
  const featured = await client.from("products").select("id,featured,featured_order").order("featured_order");
  const candidates = await client.from("products").select("id,title,artist").eq("status", "published").order("created_at").limit(2);
  if (content.error) throw content.error;
  if (sections.error) throw sections.error;
  if (featured.error) throw featured.error;
  if (candidates.error) throw candidates.error;
  originalContent = content.data;
  originalSections = sections.data;
  originalFeatured = featured.data;
  featuredProducts = candidates.data;
  await client.from("products").update({ featured: false }).neq("id", "00000000-0000-0000-0000-000000000000");
  for (const [index, product] of featuredProducts.entries()) {
    await client.from("products").update({ featured: true, featured_order: index }).eq("id", product.id);
  }
});

test.afterAll(async () => {
  const current = await client.from("homepage_content").select("hero_image_storage_path").eq("id", true).single();
  const originalPath = String(originalContent.hero_image_storage_path || "");
  const currentPath = current.data?.hero_image_storage_path || "";
  if (currentPath && currentPath !== originalPath) await client.storage.from("site-assets").remove([currentPath]);
  await client.from("homepage_sections").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (originalSections.length) await client.from("homepage_sections").insert(originalSections);
  await client.from("homepage_content").update({
    eyebrow: originalContent.eyebrow, heading: originalContent.heading, body: originalContent.body,
    hero_image_storage_path: originalContent.hero_image_storage_path, hero_image_alt: originalContent.hero_image_alt,
    actions: originalContent.actions, trust_items: originalContent.trust_items, trust_strip_visible: originalContent.trust_strip_visible,
    info_eyebrow: originalContent.info_eyebrow, info_heading: originalContent.info_heading, info_body: originalContent.info_body,
    info_section_visible: originalContent.info_section_visible
  }).eq("id", true);
  await client.from("products").update({ featured: false }).neq("id", "00000000-0000-0000-0000-000000000000");
  for (const product of originalFeatured.filter(product => product.featured).sort((first, second) => (first.featured_order ?? 99) - (second.featured_order ?? 99))) {
    await client.from("products").update({ featured: true, featured_order: product.featured_order }).eq("id", product.id);
  }
});

test("edit, persist, and render the homepage hero and sections", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    if (new URL(route.request().url()).hostname.endsWith("supabase.co")) throw new Error("Tests must not access production");
    await route.continue();
  });
  await page.goto("/admin/");
  await page.getByPlaceholder("Email admin").fill(credentials.email);
  await page.getByPlaceholder("Password", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Inventario editable" })).toBeVisible();
  await page.getByRole("button", { name: "Página principal", exact: true }).click();
  const editor = page.getByRole("form", { name: "Editor de portada" });
  await expect(editor).toBeVisible();
  await editor.getByLabel("Eyebrow", { exact: true }).fill(prefix);
  await editor.getByLabel("Título H1", { exact: true }).fill(`${prefix} heading`);
  await editor.getByLabel("Texto introductorio", { exact: true }).fill(`Texto **importante** con [enlace](https://example.com).`);
  await expect(editor.getByLabel("Imagen destacada", { exact: true })).toHaveCount(0);
  await editor.getByLabel("Texto del botón 1", { exact: true }).fill("Explorar discos");
  await editor.getByLabel("Destino", { exact: true }).first().fill("#catalogo");
  await editor.getByLabel("Visible", { exact: true }).nth(1).uncheck();

  const trustEditor = editor.locator('[aria-labelledby="trust-strip-title"]');
  await trustEditor.getByLabel("Texto 1", { exact: true }).fill(`${prefix} confianza`);
  await trustEditor.getByRole("button", { name: "Eliminar texto 4", exact: true }).click();
  await trustEditor.getByRole("button", { name: "Agregar texto", exact: true }).click();
  await trustEditor.getByLabel("Texto 4", { exact: true }).fill(`${prefix} agregado`);
  await trustEditor.getByLabel("Visible", { exact: true }).uncheck();

  const infoEditor = editor.locator('[aria-labelledby="info-section-title"]');
  await infoEditor.getByLabel("Eyebrow de información", { exact: true }).fill(`${prefix} estado`);
  await infoEditor.getByLabel("Título de información", { exact: true }).fill(`${prefix} información`);
  await infoEditor.getByLabel("Descripción de información", { exact: true }).fill("Detalle **editable**.");
  await infoEditor.getByLabel("Visible", { exact: true }).uncheck();

  const sectionEditors = editor.locator(".homepage-section-editor");
  const existingSectionCount = await sectionEditors.count();
  for (let index = 0; index < existingSectionCount; index++) {
    page.once("dialog", dialog => dialog.accept());
    await sectionEditors.first().getByRole("button", { name: /Eliminar sección/ }).click();
    await expect(sectionEditors).toHaveCount(existingSectionCount - index - 1);
  }
  await editor.getByRole("button", { name: "Agregar sección", exact: true }).click();
  await editor.getByRole("button", { name: "Agregar sección", exact: true }).click();
  await sectionEditors.nth(0).getByLabel("Título", { exact: true }).fill(`${prefix} visible`);
  await sectionEditors.nth(0).getByLabel("Descripción", { exact: true }).fill("Contenido **visible**.");
  await sectionEditors.nth(1).getByLabel("Título", { exact: true }).fill(`${prefix} oculto`);
  await sectionEditors.nth(1).getByLabel("Descripción", { exact: true }).fill("Contenido oculto.");
  await sectionEditors.nth(1).getByRole("button", { name: "Ocultar sección 2", exact: true }).click();
  await page.screenshot({ path: ".local/homepage-editor-desktop.png", fullPage: true });
  await editor.getByRole("button", { name: "Guardar portada", exact: true }).click();
  await expect(page.getByText("Portada guardada", { exact: true })).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Página principal", exact: true }).click();
  await expect(editor.getByLabel("Título H1", { exact: true })).toHaveValue(`${prefix} heading`);
  await expect(editor.getByLabel("Texto 1", { exact: true })).toHaveValue(`${prefix} confianza`);
  await expect(editor.getByLabel("Texto 4", { exact: true })).toHaveValue(`${prefix} agregado`);
  await expect(editor.getByLabel("Eyebrow de información", { exact: true })).toHaveValue(`${prefix} estado`);
  await expect(editor.getByLabel("Título de información", { exact: true })).toHaveValue(`${prefix} información`);
  await expect(editor.getByLabel("Descripción de información", { exact: true })).toHaveValue("Detalle **editable**.");
  await expect(trustEditor.getByLabel("Visible", { exact: true })).not.toBeChecked();
  await expect(infoEditor.getByLabel("Visible", { exact: true })).not.toBeChecked();
  await expect(editor.locator(".homepage-section-editor")).toHaveCount(2);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: `${prefix} heading`, exact: true })).toBeVisible();
  await expect(page.locator(".hero-copy .eyebrow")).toHaveText(prefix);
  await expect(page.locator(".hero-copy strong")).toHaveText("importante");
  await expect(page.locator(".hero-copy a", { hasText: "enlace" })).toHaveAttribute("href", "https://example.com");
  await expect(page.getByRole("link", { name: "Explorar discos", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Como clasificamos", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: `${prefix} visible`, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: `${prefix} oculto`, exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Informacion de compra" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: `${prefix} información`, exact: true })).toHaveCount(0);
  const carousel = page.getByRole("region", { name: "Discos destacados" });
  await expect(carousel.locator("strong")).toHaveText(featuredProducts[0].title);
  await expect(carousel.locator(".featured-record-copy")).toContainText(featuredProducts[0].artist);
  await expect(carousel.locator("strong")).toHaveText(featuredProducts[1].title, { timeout: 5500 });
  await carousel.getByRole("button", { name: "Disco destacado anterior" }).click();
  await expect(carousel.locator("strong")).toHaveText(featuredProducts[0].title);
  await expect(carousel.getByRole("button", { name: "Pausar carrusel" })).toBeVisible();
  const backToTop = page.getByRole("button", { name: "Ir arriba", exact: true });
  await expect(backToTop).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(backToTop).toBeVisible();
  await backToTop.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);
  await page.screenshot({ path: ".local/homepage-storefront-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: ".local/homepage-storefront-mobile.png" });
  expect(errors).toEqual([]);
});
