import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { localSupabase, projectRoot } from "./local-supabase.mjs";

const config = localSupabase();
const client = createClient(config.API_URL, config.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const path = join(projectRoot, ".local", "review-access.json");
let access;
try { access = JSON.parse(await readFile(path, "utf8")); }
catch { access = { email: "sprint3@local.test", password: randomBytes(18).toString("base64url") }; }
const { data, error } = await client.auth.admin.listUsers();
if (error) throw error;
const existing = data.users.find(user => user.email === access.email);
const result = existing
  ? await client.auth.admin.updateUserById(existing.id, { password: access.password, email_confirm: true })
  : await client.auth.admin.createUser({ ...access, email_confirm: true });
if (result.error) throw result.error;
await mkdir(join(projectRoot, ".local"), { recursive: true });
await writeFile(path, JSON.stringify(access, null, 2));
console.log(`Local review account ready. Credentials: ${path}`);
