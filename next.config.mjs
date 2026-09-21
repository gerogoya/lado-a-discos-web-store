import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const repoName = "lado-a-discos-web-store";
const defaultGitHubPagesBasePath = isGitHubPages ? `/${repoName}` : "";
const githubPagesBasePath =
  process.env.NEXT_PUBLIC_BASE_PATH ?? defaultGitHubPagesBasePath;

if (githubPagesBasePath && !githubPagesBasePath.startsWith("/")) {
  throw new Error("NEXT_PUBLIC_BASE_PATH must be empty or start with '/'.");
}

const basePath = githubPagesBasePath.replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1"],
  ...(isGitHubPages ? { output: "export" } : {}),
  trailingSlash: true,
  basePath: basePath || undefined,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath
  },
  outputFileTracingRoot: __dirname,
  images: {
    unoptimized: true
  }
};

export default nextConfig;
