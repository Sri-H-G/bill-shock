import type { NextConfig } from "next";

// GITHUB_PAGES=1 builds a static demo for https://sri-h-g.github.io/bill-shock/.
// Pages can't run API routes, so bill scanning is off there and the sample bill drives the flow.
const pages = process.env.GITHUB_PAGES === "1";

const nextConfig: NextConfig = pages
  ? {
      output: "export",
      basePath: "/bill-shock",
      trailingSlash: true,
      images: { unoptimized: true },
      env: { NEXT_PUBLIC_STATIC_DEMO: "1" },
    }
  : {};

export default nextConfig;
