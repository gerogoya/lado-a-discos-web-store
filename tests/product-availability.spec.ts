import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const config = JSON.parse(execFileSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "status", "-o", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
const service = createClient(config.API_URL, config.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(config.API_URL, config.ANON_KEY, { auth: { persistSession: false } });
const credentials = JSON.parse(readFileSync(".local/review-access.json", "utf8"));
const admin = createClient(config.API_URL, config.ANON_KEY, { auth: { persistSession: false } });
let original: { id: string; slug: string; artist: string; title: string; status: string; visible_in_main_list: boolean; featured: boolean };

test.beforeAll(async () => {
  const login = await admin.auth.signInWithPassword(credentials);
  if (login.error) throw login.error;
  const response = await service.from("products")
    .select("id, slug, artist, title, status, visible_in_main_list, featured")
    .eq("status", "published")
    .not("slug", "like", "vinilo-12-pulgadas-%")
    .limit(1)
    .single();
  if (response.error) throw response.error;
  original = response.data;
});

test.afterEach(async () => {
  if (original) {
    const { error } = await service.from("products").update({
      status: original.status,
      visible_in_main_list: original.visible_in_main_list,
      featured: original.featured
    }).eq("id", original.id);
    if (error) throw error;
  }
});

test("reserved and sold records need explicit catalog visibility and use inquiry-only UI", async ({ page }) => {
  const hidden = await service.from("products").update({ status: "reserved", visible_in_main_list: false, featured: false }).eq("id", original.id);
  if (hidden.error) throw hidden.error;
  expect((await anon.from("products").select("id").eq("id", original.id).maybeSingle()).data).toBeNull();

  const visible = await service.from("products").update({ status: "reserved", visible_in_main_list: true }).eq("id", original.id);
  if (visible.error) throw visible.error;
  const publicRecord = await anon.from("products").select("status, visible_in_main_list").eq("id", original.id).single();
  expect(publicRecord.data).toMatchObject({ status: "reserved", visible_in_main_list: true });

  await page.goto("/");
  await page.getByRole("button", { name: "Rechazar", exact: true }).click();
  await expect(page.getByText("Supabase local", { exact: true })).toBeVisible();
  const card = page.locator(".product-card").filter({ hasText: original.title }).first();
  await expect(card.getByText("Reservado", { exact: true })).toBeVisible();
  await expect(card.getByRole("link", { name: "Ver más", exact: true })).toBeVisible();
  await expect(card.getByRole("button", { name: "Agregar", exact: true })).toHaveCount(0);

  await page.goto(`/producto/?slug=${encodeURIComponent(original.slug)}`);
  await expect(page.getByRole("button", { name: "Agregar al carrito", exact: true })).toHaveCount(0);
  const inquiry = page.getByRole("link", { name: "Consultar", exact: true });
  await expect(inquiry).toBeVisible();
  expect(new URL((await inquiry.getAttribute("href"))!).searchParams.get("text")).toContain("Disponibilidad: Reservado");
});

test("an allowlisted administrator can save a published disk as hidden reserved", async () => {
  const response = await admin.from("products")
    .update({ status: "reserved", visible_in_main_list: false })
    .eq("id", original.id)
    .select("status, visible_in_main_list")
    .single();

  expect(response.error).toBeNull();
  expect(response.data).toEqual({ status: "reserved", visible_in_main_list: false });
});

test("draft records are never visible and the database enforces the rule", async () => {
  const response = await service.from("products").update({ status: "draft", visible_in_main_list: true }).eq("id", original.id);
  expect(response.error?.code).toBe("23514");
});
