import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ THIS disables ESLint during build
  },
};

export default nextConfig;