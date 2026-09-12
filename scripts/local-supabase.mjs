import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const cli = fileURLToPath(new URL("../node_modules/supabase/dist/supabase.js", import.meta.url));
export function runSupabase(args) {
  return execFileSync(process.execPath, [cli, ...args], { cwd: projectRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 20 * 1024 * 1024 });
}
export function localSupabase() {
  const config = JSON.parse(runSupabase(["status", "-o", "json"]));
  if (!["127.0.0.1", "localhost"].includes(new URL(config.API_URL).hostname)) throw new Error("Expected a local Supabase instance.");
  return config;
}
export const localDbContainer = "supabase_db_Vinyl_Store_web_site";
