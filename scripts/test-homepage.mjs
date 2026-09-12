import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const status = JSON.parse(execFileSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "status", "-o", "json"], { encoding: "utf8" }));
if (!["localhost", "127.0.0.1"].includes(new URL(status.API_URL).hostname)) throw new Error("Local tests only");
const credentials = JSON.parse(readFileSync(".local/review-access.json", "utf8"));
const anon = createClient(status.API_URL, status.ANON_KEY, { auth: { persistSession: false } });
const authenticated = createClient(status.API_URL, status.ANON_KEY, { auth: { persistSession: false } });
const service = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const prefix = `Homepage test ${Date.now()}`;
const originalContent = await service.from("homepage_content").select().eq("id", true).single();
const originalSections = await service.from("homepage_sections").select().order("sort_order");
const originalFeatured = await service.from("products").select("id,featured,featured_order").order("featured_order");
assert.equal(originalContent.error, null);
assert.equal(originalSections.error, null);
assert.equal(originalFeatured.error, null);

try {
  const denied = await anon.from("homepage_content").update({ eyebrow: prefix }).eq("id", true).select("id");
  assert.equal(denied.error, null);
  assert.equal(denied.data.length, 0, "Anonymous writes must affect no rows");
  const login = await authenticated.auth.signInWithPassword(credentials);
  assert.equal(login.error, null);
  const candidates = (originalFeatured.data ?? []).slice(0, 6);
  assert.equal(candidates.length, 6, "At least six products are required for the featured limit test");
  assert.equal((await service.from("products").update({ featured: false }).neq("id", "00000000-0000-0000-0000-000000000000")).error, null);
  for (const candidate of candidates.slice(0, 5)) {
    const result = await authenticated.from("products").update({ featured: true }).eq("id", candidate.id);
    assert.equal(result.error, null);
  }
  const sixth = await authenticated.from("products").update({ featured: true }).eq("id", candidates[5].id);
  assert.match(sixth.error?.message ?? "", /hasta 5 discos/);
  const featured = await service.from("products").select("id,featured_order").eq("featured", true).order("featured_order");
  assert.deepEqual(featured.data?.map(product => product.featured_order), [0, 1, 2, 3, 4]);
  const visibleId = crypto.randomUUID();
  const hiddenId = crypto.randomUUID();
  const saved = await authenticated.rpc("save_homepage", {
    expected_updated_at: originalContent.data.updated_at,
    content: {
      eyebrow: prefix, heading: "Heading", body: "Texto **importante**", hero_image_storage_path: "", hero_image_alt: "",
      actions: [{ id: "primary", label: "Uno", href: "#catalogo", visible: true }, { id: "secondary", label: "Dos", href: "/admin", visible: false }]
    },
    sections: [
      { id: visibleId, title: `${prefix} visible`, body: "Visible", visible: true, sort_order: 0 },
      { id: hiddenId, title: `${prefix} hidden`, body: "Hidden", visible: false, sort_order: 1 }
    ]
  });
  assert.equal(saved.error, null);
  const publicSections = await anon.from("homepage_sections").select("id").in("id", [visibleId, hiddenId]);
  assert.equal(publicSections.error, null);
  assert.deepEqual(publicSections.data.map(row => row.id), [visibleId]);
  const stale = await authenticated.rpc("save_homepage", {
    expected_updated_at: originalContent.data.updated_at,
    content: { eyebrow: prefix, heading: "Heading", body: "", hero_image_storage_path: "", hero_image_alt: "", actions: originalContent.data.actions },
    sections: []
  });
  assert.ok(stale.error, "Stale saves must be rejected");
  console.log("Homepage persistence, visibility, authentication, concurrency, and five-featured-product limit checks passed.");
} finally {
  await service.from("homepage_sections").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (originalSections.data.length) await service.from("homepage_sections").insert(originalSections.data);
  await service.from("homepage_content").update({
    eyebrow: originalContent.data.eyebrow, heading: originalContent.data.heading, body: originalContent.data.body,
    hero_image_storage_path: originalContent.data.hero_image_storage_path, hero_image_alt: originalContent.data.hero_image_alt,
    actions: originalContent.data.actions, updated_at: originalContent.data.updated_at
  }).eq("id", true);
  await service.from("products").update({ featured: false }).neq("id", "00000000-0000-0000-0000-000000000000");
  for (const product of (originalFeatured.data ?? []).filter(product => product.featured).sort((first, second) => (first.featured_order ?? 99) - (second.featured_order ?? 99))) {
    await service.from("products").update({ featured: true, featured_order: product.featured_order }).eq("id", product.id);
  }
}
