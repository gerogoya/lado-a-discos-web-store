import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { localSupabase, projectRoot } from "./local-supabase.mjs";

const config = localSupabase();
const port = process.env.PORT || "3000";
const next = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
console.log(`Admin local: http://localhost:${port}/admin/ (Supabase: ${config.API_URL})`);
const server = spawn(process.execPath, [next, "dev", "--port", port], {
  cwd: projectRoot, stdio: "inherit", windowsHide: true,
  env: { ...process.env, GITHUB_PAGES: "false", NEXT_PUBLIC_SUPABASE_URL: config.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: config.PUBLISHABLE_KEY || config.ANON_KEY }
});
server.on("exit", code => process.exit(code ?? 1));
