import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { localSupabase, projectRoot } from "./local-supabase.mjs";

const config = localSupabase();
const credentials = JSON.parse(await readFile(join(projectRoot, ".local/review-access.json"), "utf8"));
const client = createClient(config.API_URL, config.ANON_KEY, { auth: { persistSession: false } });
const anonymous = createClient(config.API_URL, config.ANON_KEY, { auth: { persistSession: false } });
const login = await client.auth.signInWithPassword(credentials);
if (login.error) throw login.error;
const prefix = `catalog-test-${Date.now()}`;
const options = [];
const products = [];
let checks = 0;
function passed(message) { checks++; console.log(`PASS ${message}`); }
async function option(kind, name) {
  const result = await client.from("catalog_options").insert({ kind, name }).select().single();
  if (result.error) throw result.error;
  options.push(result.data.id);
  return result.data;
}
try {
  const denied = await anonymous.from("catalog_options").insert({ kind: "genre", name: prefix });
  assert.ok(denied.error); passed("anonymous writes are denied");
  const artist = await option("artist", `${prefix} Artist`);
  const duplicate = await client.from("catalog_options").insert({ kind: "artist", name: `  ${prefix.toUpperCase()}   ARTIST  ` });
  assert.equal(duplicate.error?.code, "23505"); passed("case and whitespace duplicates are blocked");
  const genre = await option("genre", `${prefix} Genre`);
  const country = await option("country", `${prefix} Country`);
  const media = await option("media_condition", `${prefix} CUSTOM`);
  const format = await option("format", `${prefix} Format`);
  const label = await option("label", `${prefix} Label`);
  const sleeve = await option("sleeve_condition", `${prefix} Sleeve`);
  const payload = { slug: prefix, title: "Test", artist: "", album: "Test", artist_id: artist.id,
    genre_id: genre.id, country_id: country.id, format_id: format.id, label_id: label.id,
    media_condition_id: media.id, sleeve_condition_id: sleeve.id, year: null, status: "published" };
  const wrongKind = await client.from("products").insert({ ...payload, genre_id: artist.id });
  assert.equal(wrongKind.error?.code, "23514"); passed("references must match the field category");
  const created = await client.from("products").insert(payload).select().single();
  if (created.error) throw created.error;
  products.push(created.data.id);
  assert.equal(created.data.artist, artist.name);
  assert.equal(created.data.country, country.name);
  assert.equal(created.data.label, label.name);
  assert.equal(created.data.format, format.name);
  assert.equal(created.data.media_condition, media.name);
  assert.equal(created.data.year, null); passed("all option labels persist, custom conditions and unknown year work");
  const { error: inactiveError } = await client.from("catalog_options").update({ active: false }).eq("id", artist.id);
  assert.equal(inactiveError, null);
  const inactive = await client.from("products").insert({ ...payload, slug: `${prefix}-inactive` });
  assert.equal(inactive.error?.code, "23514");
  const keep = await client.from("products").update({ title: "Existing inactive artist" }).eq("id", created.data.id);
  assert.equal(keep.error, null); passed("inactive options cannot be newly assigned but existing associations survive");
  const used = await client.from("catalog_options").delete().eq("id", artist.id);
  assert.equal(used.error?.code, "23503"); passed("used options cannot be deleted");
  const renamed = await client.from("catalog_options").update({ name: `${prefix} Renamed` }).eq("id", artist.id);
  assert.equal(renamed.error, null);
  const publicProduct = await anonymous.from("products").select().eq("id", created.data.id).single();
  assert.equal(publicProduct.data.artist, `${prefix} Renamed`); passed("renames propagate to storefront data including inactive references");
  const clear = await client.from("products").update({ country_id: null, label_id: null }).eq("id", created.data.id).select().single();
  assert.equal(clear.error, null); assert.equal(clear.data.country, ""); assert.equal(clear.data.label, "");
  passed("optional values can be cleared without restoring a default");
  const freeText = await client.from("products").update({ country: "Arbitrary" }).eq("id", created.data.id);
  assert.equal(freeText.error?.code, "23514"); passed("unselected free text cannot bypass catalog validation");
  const invalidYear = await client.from("products").update({ year: 1899 }).eq("id", created.data.id);
  assert.equal(invalidYear.error?.code, "23514"); passed("invalid years are rejected by the database");
  const immutable = await client.from("catalog_options").update({ kind: "genre" }).eq("id", artist.id);
  assert.equal(immutable.error?.code, "23514"); passed("an option cannot change category");
  const removable = await option("artist", `${prefix} Unused`);
  const deleted = await client.from("catalog_options").delete().eq("id", removable.id);
  assert.equal(deleted.error, null); passed("unused options can be removed");
  console.log(`${checks} database checks passed against local Supabase.`);
} finally {
  if (products.length) {
    const result = await client.from("products").delete().in("id", products);
    if (result.error) throw result.error;
  }
  if (options.length) {
    const result = await client.from("catalog_options").delete().in("id", options);
    if (result.error) throw result.error;
  }
  await client.auth.signOut();
}
