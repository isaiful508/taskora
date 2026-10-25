import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `cacheComponents` (Next 16 "use cache" / dynamicIO) is intentionally left
  // off: the dashboard routes are fully client-driven and the flag makes the
  // router reject client navigations with
  // "Could not validate that a segment in your UI has instant navigation".
  // `partialPrefetching` depends on `cacheComponents`, so it is off as well.
  turbopack: {
    // The repository is a monorepo with one lockfile per workspace. Pointing
    // Turbopack at this app's directory keeps its file watching scoped.
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
