import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // Repo sits under a parent dir that has its own lockfile; pin the root here.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
