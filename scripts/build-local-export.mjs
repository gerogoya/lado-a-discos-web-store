import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { localSupabase, projectRoot } from "./local-supabase.mjs";

const config = localSupabase();
const next = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const result = spawnSync(process.execPath, [next, "build"], {
  cwd: projectRoot, stdio: "inherit", windowsHide: true,
  env: { ...process.env, GITHUB_PAGES: "true", NEXT_PUBLIC_BASE_PATH: "",
    NEXT_PUBLIC_SUPABASE_URL: config.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: config.PUBLISHABLE_KEY || config.ANON_KEY }
});
process.exit(result.status ?? 1);
