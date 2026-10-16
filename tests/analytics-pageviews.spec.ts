import { expect, test, type Page } from "@playwright/test";

const legacy = "/producto/vinilo-12-pulgadas-004/";
const query = "/producto/?slug=the-cult-sonic-temple&utm_source=test";
const row = (slug: string) => ({
  id: slug, slug, artist: slug.includes("004") ? "Saxon" : "The Cult",
  title: slug.includes("004") ? "Strong Arm Metal" : "Sonic Temple", album: "",
  status: "published", price: 15000, currency: "ARS", stock: 1,
  genre: "Rock", country: "UK", year: 1989, media_condition: "VG", sleeve_condition: "VG",
  product_images: [], product_identifiers: [], description: "", visible_in_main_list: true
});

async function setup(page: Page, consent?: "accepted" | "declined") {
  if (consent) await page.addInitScript(value => localStorage.setItem("lado-a-discos-analytics-consent", value), consent);
  // Inspect the actual application gtag queue without sending test traffic to Google.
  await page.route("https://www.googletagmanager.com/**", route => route.fulfill({ contentType: "application/javascript", body: "" }));
  await page.route("**/rest/v1/**", route => {
    const url = new URL(route.request().url());
    const slug = url.searchParams.get("slug")?.replace(/^eq\./, "");
    return route.fulfill({ json: url.pathname.endsWith("/products") ? (slug ? row(slug) : []) : null });
  });
}

async function views(page: Page) {
  return page.evaluate(() => ((window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer || [])
    .map(entry => Array.from(entry)).filter(entry => entry[0] === "event" && entry[1] === "page_view")
    .map(entry => entry[2] as { page_title: string; page_location: string; page_referrer: string }));
}

for (const path of [legacy, query]) {
  test(`resolved title and one view on direct entry: ${path}`, async ({ page }) => {
    await setup(page, "accepted");
    await page.goto(path);
    const title = path === legacy ? "Saxon - Strong Arm Metal | LADO A DISCOS" : "The Cult - Sonic Temple | LADO A DISCOS";
    await expect(page).toHaveTitle(title);
    await expect.poll(() => views(page)).toHaveLength(1);
    expect((await views(page))[0]).toMatchObject({ page_title: title, page_location: page.url() });
    await page.getByRole("button", { name: "Agregar al carrito", exact: true }).click();
    await expect(page.getByRole("button", { name: "En carrito", exact: true })).toBeDisabled();
    expect(await views(page)).toHaveLength(1);
  });
}

test("late consent sends only the current screen; back and forward are new visits", async ({ page }) => {
  await setup(page);
  await page.goto(legacy);
  await expect(page).toHaveTitle("Saxon - Strong Arm Metal | LADO A DISCOS");
  expect(await views(page)).toHaveLength(0);
  await page.getByRole("button", { name: "Aceptar", exact: true }).click();
  await expect.poll(() => views(page)).toHaveLength(1);
  await page.getByRole("link", { name: "Volver al catalogo", exact: true }).click();
  await expect.poll(() => views(page)).toHaveLength(2);
  await page.goBack();
  await expect(page).toHaveTitle("Saxon - Strong Arm Metal | LADO A DISCOS");
  await expect.poll(() => views(page)).toHaveLength(3);
  await page.goForward();
  await expect(page).toHaveTitle("LADO A DISCOS | Vinilos usados y nuevos");
  await expect.poll(() => views(page)).toHaveLength(4);
  expect((await views(page))[1].page_referrer).toContain(legacy);
});

test("slow response and query changes never send an old product under the new URL", async ({ page }) => {
  await setup(page, "accepted");
  let release!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/products?**", async route => {
    const slug = new URL(route.request().url()).searchParams.get("slug")!.slice(3);
    if (slug === "slow") await hold;
    await route.fulfill({ json: row(slug) });
  });
  await page.goto("/producto/?slug=slow");
  await expect(page).toHaveTitle("Cargando disco | LADO A DISCOS");
  expect(await views(page)).toHaveLength(0);
  await page.evaluate(() => history.pushState(null, "", "/producto/?slug=vinilo-12-pulgadas-004&utm_source=test"));
  await expect(page).toHaveTitle("Saxon - Strong Arm Metal | LADO A DISCOS");
  await expect.poll(() => views(page)).toHaveLength(1);
  release();
  await page.getByRole("button", { name: "Agregar al carrito", exact: true }).click();
  expect((await views(page))[0].page_location).toContain("slug=vinilo-12-pulgadas-004&utm_source=test");
  expect(await views(page)).toHaveLength(1);
});

for (const state of ["missing", "error", "draft"]) {
  test(`legacy ${state} never falls back to seed identity`, async ({ page }) => {
    await setup(page, "accepted");
    await page.route("**/rest/v1/products?**", route => route.fulfill({
      status: state === "error" ? 500 : 200,
      headers: { "Retry-After": "0" },
      json: state === "missing" ? null : state === "draft" ? { ...row("004"), status: "draft" } : { message: "unavailable" }
    }));
    await page.goto(legacy);
    await expect(page).toHaveTitle(`${state === "error" ? "No se pudo cargar el disco" : "Disco no encontrado"} | LADO A DISCOS`);
    await expect.poll(() => views(page)).toHaveLength(1);
    expect((await views(page))[0].page_title).not.toContain("Artista por completar");
    await expect(page.getByRole("button", { name: "Agregar al carrito", exact: true })).toHaveCount(0);
  });
}

test("declined consent and admin never initialize analytics", async ({ page }) => {
  await setup(page, "declined");
  await page.goto(legacy);
  await expect(page).toHaveTitle("Saxon - Strong Arm Metal | LADO A DISCOS");
  expect(await views(page)).toHaveLength(0);
  await expect(page.locator('script[src*="googletagmanager"]')).toHaveCount(0);
  await page.evaluate(() => localStorage.setItem("lado-a-discos-analytics-consent", "accepted"));
  await page.goto("/admin/");
  await expect(page.locator('script[src*="googletagmanager"]')).toHaveCount(0);
  expect(await views(page)).toHaveLength(0);
});

test("accepting after multiple screens does not replay previous visits", async ({ page }) => {
  await setup(page);
  await page.goto("/producto/?slug=vinilo-12-pulgadas-004");
  await expect(page).toHaveTitle("Saxon - Strong Arm Metal | LADO A DISCOS");
  await page.evaluate(() => history.pushState(null, "", "/producto/?slug=the-cult-sonic-temple"));
  await expect(page).toHaveTitle("The Cult - Sonic Temple | LADO A DISCOS");
  await page.getByRole("button", { name: "Aceptar", exact: true }).click();
  await expect.poll(() => views(page)).toHaveLength(1);
  expect((await views(page))[0].page_title).toBe("The Cult - Sonic Temple | LADO A DISCOS");
});

test("admin disables an already initialized tag and leaving resumes public views", async ({ page }) => {
  await setup(page, "accepted");
  await page.goto(query);
  await expect.poll(() => views(page)).toHaveLength(1);
  await page.evaluate(() => history.pushState(null, "", "/admin/"));
  await expect.poll(() => page.evaluate(() => (window as unknown as Record<string, unknown>)["ga-disable-G-NWYWRTJ1DJ"])).toBe(true);
  expect(await views(page)).toHaveLength(1);
  await page.goBack();
  await expect.poll(() => views(page)).toHaveLength(2);
});
