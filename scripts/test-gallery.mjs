import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { localSupabase } from "./local-supabase.mjs";

const config = localSupabase();
const client = createClient(config.API_URL, config.ANON_KEY, { auth: { persistSession: false } });
const service = createClient(config.API_URL, config.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anonymous = createClient(config.API_URL, config.ANON_KEY, { auth: { persistSession: false } });
const login = await client.auth.signInWithPassword(JSON.parse(await readFile(".local/review-access.json", "utf8")));
if (login.error) throw login.error;
const created = await service.from("products").insert({ title: "Gallery DB test", artist: "", album: "", slug: `gallery-db-${Date.now()}` }).select().single();
if (created.error) throw created.error;
const id = created.data.id;
const paths = Array.from({ length: 6 }, (_, i) => `${id}/test-${i}.jpg`);
const file = await readFile("public/products/IMG_2273.jpg");
function gallery(list) { return list.map(storage_path => ({ storage_path, alt_text: storage_path })); }
async function save(expected, desired) {
  return client.rpc("save_product_gallery", { target_product: id, expected_paths: expected, gallery: gallery(desired) });
}
try {
  for (const path of paths) {
    const { error } = await service.storage.from("product-images").upload(path, file, { contentType: "image/jpeg" });
    if (error) throw error;
  }
  const initial = paths.slice(0,5);
  assert.equal((await save([], initial)).error, null);
  const rejected = await save(initial, paths);
  assert.equal(rejected.error?.code, "23514");
  assert.equal((await client.from("product_images").select().eq("product_id", id)).data.length, 5);
  console.log("PASS sixth image rejected without changing the saved gallery");
  const reverse = [...initial].reverse();
  const reordered = await save(initial, reverse);
  assert.equal(reordered.error, null);
  assert.deepEqual(reordered.data.map(image => image.storage_path), reverse);
  console.log("PASS reordering a full gallery keeps all five images");
  assert.equal((await save(initial, initial)).error?.code, "40001");
  assert.equal((await save(initial, reverse)).error, null);
  console.log("PASS concurrent stale changes rejected and lost-response retry is idempotent");
  assert.equal((await save(reverse, [paths[0], paths[0]])).error?.code, "23514");
  assert.equal((await save(reverse, [`${id}/missing.jpg`])).error?.code, "23514");
  const unchanged = await client.from("product_images").select().eq("product_id", id).order("sort_order");
  assert.deepEqual(unchanged.data.map(image => image.storage_path), reverse);
  console.log("PASS duplicate and missing files rejected atomically");
  const denied = await anonymous.rpc("save_product_gallery", { target_product: id, expected_paths: reverse, gallery: [] });
  assert.ok(denied.error);
  console.log("PASS anonymous gallery writes denied");
  assert.equal((await save(reverse, [])).error, null);
  assert.equal((await client.from("product_images").select().eq("product_id", id)).data.length, 0);
  console.log("PASS removal of all images persists");
  const insert = await client.from("product_images").insert(paths.slice(0,4).map((storage_path, sort_order) => ({ product_id: id, storage_path, sort_order })));
  assert.equal(insert.error, null);
  const concurrent = await Promise.all(paths.slice(4).map(storage_path => client.from("product_images").insert({ product_id: id, storage_path, sort_order: 4 })));
  assert.equal(concurrent.filter(result => !result.error).length, 1);
  assert.equal(concurrent.filter(result => result.error?.code === "23514").length, 1);
  console.log("PASS concurrent direct inserts cannot exceed five images");
} finally {
  await service.from("products").delete().eq("id", id);
  await service.storage.from("product-images").remove(paths);
  await client.auth.signOut();
}
