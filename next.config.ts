import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
    ],
  },
  // Keep Turbopack scoped to this project even when parent folders contain locks.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
