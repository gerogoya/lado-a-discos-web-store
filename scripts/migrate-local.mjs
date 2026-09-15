import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";
import { localSupabase, localDbContainer, projectRoot, runSupabase } from "./local-supabase.mjs";

localSupabase();
function sql(query) {
  return execFileSync("docker", ["exec", localDbContainer, "psql", "-U", "postgres", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1", "-c", query], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }).trim();
}
const version = "20260915000000";
if (sql(`select count(*) from supabase_migrations.schema_migrations where version='${version}'`) === "1") {
  console.log("All local migrations are already applied.");
  process.exit(0);
}
const directory = join(projectRoot, ".local", `before-catalog-${Date.now()}`);
await mkdir(directory, { recursive: true });
const backup = execFileSync("docker", ["exec", localDbContainer, "pg_dump", "-U", "postgres", "-d", "postgres", "--schema=public"], { maxBuffer: 30 * 1024 * 1024 });
await writeFile(join(directory, "public.sql"), backup);
const fields = "id,slug,artist,title,album,description,year,genre,price,currency,status,media_condition,sleeve_condition,stock,is_new,featured,created_at";
const snapshotQuery = `select coalesce(jsonb_agg(t order by id),'[]'::jsonb) from (select ${fields} from public.products) t`;
const before = sql(snapshotQuery);
const imageCount = sql("select count(*) from public.product_images");
await writeFile(join(directory, "products.json"), before);
console.log(`Backup local: ${directory}`);
console.log(runSupabase(["migration", "up", "--local"]));
assert.deepEqual(JSON.parse(sql(snapshotQuery)), JSON.parse(before), "Existing product values must be preserved");
assert.equal(sql("select count(*) from public.product_images"), imageCount, "Image relationships must be preserved");
console.log(`Migrations verified: ${JSON.parse(before).length} products and ${imageCount} image rows preserved.`);
