import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  allowedDevOrigins: ['192.168.0.163'],
};

export default nextConfig;
