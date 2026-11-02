import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : null;

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: supabaseHostname
      ? [{
          protocol: "https",
          hostname: supabaseHostname,
          pathname: "/storage/v1/object/public/course-thumbnails/**",
        }]
      : [],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
