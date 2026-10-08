import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const config = JSON.parse(execFileSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "status", "-o", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
if (!["localhost", "127.0.0.1"].includes(new URL(config.API_URL).hostname)) throw new Error("Local tests only");
if (process.env.ADMIN_TEST_URL && !["localhost", "127.0.0.1"].includes(new URL(process.env.ADMIN_TEST_URL).hostname)) throw new Error("Local UI only");
const credentials = JSON.parse(readFileSync(".local/review-access.json", "utf8"));
const service = createClient(config.API_URL, config.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(config.API_URL, config.ANON_KEY, { auth: { persistSession: false } });
let original: Record<string, unknown>;
let newSlug: string;

test.beforeAll(async () => {
  const contact = await service.from("contact_settings").select().single();
  if (contact.error) throw contact.error;
  original = contact.data;
  const product = await service.from("products").select("slug").eq("status", "published").not("slug", "like", "vinilo-12-pulgadas-%").limit(1).single();
  if (product.error) throw product.error;
  newSlug = product.data.slug;
});
test.afterAll(async () => {
  if (original) {
    const { error } = await service.from("contact_settings").update(original).eq("id", true);
    if (error) throw error;
  }
});

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async route => {
    const host = new URL(route.request().url()).hostname;
    if (host.endsWith("supabase.co")) throw new Error("Production access forbidden");
    if (host.includes("google-analytics") || host === "maps.google.com") return route.abort();
    await route.continue();
  });
});

async function login(page: Page) {
  await page.goto("/admin/");
  await page.getByPlaceholder("Email admin").fill(credentials.email);
  await page.getByPlaceholder("Password", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Inventario editable" })).toBeVisible();
  await page.getByRole("button", { name: "Contacto", exact: true }).click();
  await expect(page.getByRole("form", { name: "Editor de contacto" })).toBeVisible();
}

test("contact permissions, validation and concurrent save protection", async () => {
  expect((await anon.from("contact_settings").select().single()).error).toBeNull();
  expect((await anon.from("contact_settings").update({ heading: "denied" }).eq("id", true)).error).not.toBeNull();
  const outsider = await service.auth.admin.createUser({ email: `contact-${randomUUID()}@local.test`, password: randomUUID(), email_confirm: true });
  // Use a known local-only password to test authenticated non-admin access.
  expect(outsider.error).toBeNull();
  const password = randomUUID();
  const userId = outsider.data.user!.id;
  try {
    expect((await service.auth.admin.updateUserById(userId, { password })).error).toBeNull();
    const other = createClient(config.API_URL, config.ANON_KEY, { auth: { persistSession: false } });
    expect((await other.auth.signInWithPassword({ email: outsider.data.user!.email!, password })).error).toBeNull();
    const denied = await other.from("contact_settings").update({ heading: "denied" }).eq("id", true).select();
    expect(denied.data).toEqual([]);
    expect((await other.rpc("save_contact", { expected_updated_at: original.updated_at, content: original })).error?.code).toBe("42501");
    const admin = createClient(config.API_URL, config.ANON_KEY, { auth: { persistSession: false } });
    expect((await admin.auth.signInWithPassword(credentials)).error).toBeNull();
    const invalid = await admin.rpc("save_contact", { expected_updated_at: original.updated_at, content: { ...original, socials: [{ id: "bad", label: "Bad", url: "javascript:alert(1)", visible: true }] } });
    expect(invalid.error?.code).toBe("23514");
    const saved = await admin.rpc("save_contact", { expected_updated_at: original.updated_at, content: original });
    expect(saved.error).toBeNull();
    const stale = await admin.rpc("save_contact", { expected_updated_at: original.updated_at, content: original });
    expect(stale.error?.code).toBe("40001");
  } finally { expect((await service.auth.admin.deleteUser(userId)).error).toBeNull(); }
});

test("edit contact and social networks, persist and use the saved WhatsApp everywhere", async ({ page }) => {
  await login(page);
  const editor = page.getByRole("form", { name: "Editor de contacto" });
  await editor.getByRole("textbox", { name: "Horarios (opcional)", exact: true }).fill("Retiros: coordinar por WhatsApp.");
  await editor.getByLabel("WhatsApp", { exact: true }).fill("5493795551234");
  await editor.getByRole("button", { name: "Agregar red social", exact: true }).click();
  await editor.getByLabel("Nombre de la red 2", { exact: true }).fill("TikTok");
  await editor.getByLabel("Enlace de la red 2", { exact: true }).fill("https://www.tiktok.com/@discosladoa");
  await editor.getByRole("button", { name: "Subir red 2", exact: true }).click();
  await editor.getByLabel("Visible", { exact: true }).nth(1).uncheck();
  await editor.getByRole("button", { name: "Guardar contacto", exact: true }).click();
  await expect(page.getByText("Contacto guardado", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Contacto", exact: true }).click();
  await expect(editor.getByLabel("Nombre de la red 1", { exact: true })).toHaveValue("TikTok");
  await expect(editor.getByRole("textbox", { name: "Horarios (opcional)", exact: true })).toHaveValue("Retiros: coordinar por WhatsApp.");
  await page.goto("/#contacto");
  const contact = page.locator("#contacto");
  await expect(contact.getByRole("link", { name: "TikTok" })).toBeVisible();
  await expect(contact.getByRole("link", { name: "Instagram" })).toHaveCount(0);
  await expect(contact.getByRole("link", { name: "Escribinos por WhatsApp" })).toHaveAttribute("href", /wa.me\/5493795551234\?/);
  await expect(contact.locator("iframe")).toHaveAttribute("src", /San%20Mart/);
  await page.getByRole("button", { name: "Rechazar", exact: true }).click();
  await page.getByRole("button", { name: "Agregar", exact: true }).first().click();
  await expect(page.getByRole("link", { name: "Pedir por WhatsApp" })).toHaveAttribute("href", /wa.me\/5493795551234\?/);
  for (const route of [`/producto/?slug=${encodeURIComponent(newSlug)}`, "/producto/vinilo-12-pulgadas-001/"]) {
    await page.goto(route);
    const inquiry = page.getByRole("link", { name: "Consultar", exact: true });
    await expect(inquiry).toHaveAttribute("href", /wa.me\/5493795551234\?/);
    const message = new URL((await inquiry.getAttribute("href"))!).searchParams.get("text")!;
    expect(message).toContain("Disponibilidad: En stock");
    const productUrl = message.split("Link/Producto: ")[1];
    expect(new URL(productUrl).pathname).toBe(new URL(route, "http://localhost").pathname);
    expect(new URL(productUrl).search).toBe(new URL(route, "http://localhost").search);
    expect(new URL(productUrl).hostname).toBe("localhost");
    await page.goto(productUrl);
    await expect(inquiry).toBeVisible();
  }
  await page.goto("/privacidad/");
  await expect(page.getByRole("link", { name: "escribinos por WhatsApp" })).toHaveAttribute("href", /wa.me\/5493795551234\?/);
  await page.goto("/admin/");
  await page.getByRole("button", { name: "Contacto", exact: true }).click();
  await editor.getByRole("button", { name: "Eliminar red 1", exact: true }).click();
  await editor.getByRole("button", { name: "Guardar contacto", exact: true }).click();
  await expect(page.getByText("Contacto guardado", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Contacto", exact: true }).click();
  await expect(editor.getByLabel("Nombre de la red 1", { exact: true })).toHaveValue("Instagram");
  await expect(editor.getByLabel("Nombre de la red 2", { exact: true })).toHaveCount(0);
});

test("metadata and public navigation expose brand assets and exclude admin", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Navegacion principal" }).getByRole("link", { name: "Admin" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Navegacion principal" }).getByRole("link", { name: "Contacto" })).toHaveAttribute("href", "#contacto");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://www.ladoadiscos.com/opengraph-image.png");
  for (const path of ["/opengraph-image.png", "/brand/favicon.svg", "/brand/favicon-32.png", "/brand/apple-touch-icon.png"]) expect((await request.get(path)).status()).toBe(200);
  for (const path of ["/admin/", "/admin/accept-invite/"]) {
    const html = await (await request.get(path)).text();
    expect(html).toMatch(/name="robots" content="noindex, nofollow"/);
  }
});

test("full-width consent remembers choices and leaves mobile cart controls accessible", async ({ page }) => {
  let analyticsRequests = 0;
  await page.route("https://www.googletagmanager.com/**", route => { analyticsRequests++; return route.fulfill({ contentType: "application/javascript", body: "" }); });
  await page.goto("/");
  const banner = page.getByRole("region", { name: "Preferencias de privacidad" });
  await expect(banner).toBeVisible();
  expect(analyticsRequests).toBe(0);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(async () => Math.round((await banner.boundingBox())!.width)).toBe(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.getByRole("button", { name: "Agregar", exact: true }).first().click();
  const checkout = page.getByRole("link", { name: "Pedir por WhatsApp" });
  await expect(checkout).toBeVisible();
  await expect.poll(async () => {
    const button = (await checkout.boundingBox())!;
    return button.y + button.height <= (await banner.boundingBox())!.y;
  }).toBe(true);
  await banner.getByRole("button", { name: "Rechazar" }).click();
  await page.reload();
  await expect(banner).toHaveCount(0);
  expect(analyticsRequests).toBe(0);
  await page.goto("/privacidad/");
  await page.getByRole("button", { name: "Cambiar mi elección de Analytics" }).click();
  await expect(banner).toBeVisible();
  await banner.getByRole("button", { name: "Aceptar" }).click();
  await expect.poll(() => analyticsRequests).toBe(1);
  await page.reload();
  await expect(banner).toHaveCount(0);
  await expect.poll(() => analyticsRequests).toBe(2);
  await page.goto("/admin/");
  await expect(banner).toHaveCount(0);
  await expect(page.locator('script[src*="googletagmanager"]')).toHaveCount(0);
});

test("capture desktop and mobile review with the configured contact restored", async ({ page }) => {
  expect((await service.from("contact_settings").update(original).eq("id", true)).error).toBeNull();
  // Let the real map load for visual review; keep production data inaccessible.
  await page.unroute("**/*");
  await page.route("**/*", async route => {
    if (new URL(route.request().url()).hostname.endsWith("supabase.co")) throw new Error("Production access forbidden");
    await route.continue();
  });
  await page.goto("/");
  await expect(page.getByText("Supabase local", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Preferencias de privacidad" })).toBeVisible();
  await page.addStyleTag({ content: "html { scroll-behavior: auto !important; } nextjs-portal { display: none; }" });
  await page.screenshot({ path: ".local/sprint5-home-desktop.png" });
  const contact = page.locator("#contacto");
  await contact.evaluate(element => element.scrollIntoView({ block: "start" }));
  await expect(page.frameLocator("#contacto iframe").getByText(/Map data/).filter({ visible: true }).first()).toBeVisible();
  await page.screenshot({ path: ".local/sprint5-contact-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.getByRole("button", { name: "Ir arriba", exact: true })).toBeHidden();
  await page.screenshot({ path: ".local/sprint5-home-mobile.png" });
  await page.getByRole("button", { name: "Rechazar", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 1100 });
  await contact.evaluate(element => element.scrollIntoView({ block: "start" }));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: ".local/sprint5-contact-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page);
  await page.addStyleTag({ content: "nextjs-portal { display: none; }" });
  await page.screenshot({ path: ".local/sprint5-admin-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: ".local/sprint5-admin-mobile.png", fullPage: true });
});
