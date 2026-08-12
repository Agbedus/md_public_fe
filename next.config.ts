import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDFKit loads Node-specific font and binary assets at runtime. Keeping it
  // external prevents the App Router bundler from dropping those files in
  // production deployments.
  serverExternalPackages: ['pdfkit'],
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
  // Uploaded avatars are stored by the backend and referenced by the relative
  // path it returns (`/uploads/avatars/<id>.png`). Without this proxy the
  // browser would resolve that against the *frontend* origin and 404, since the
  // files live behind the FastAPI `/uploads` static mount.
  async rewrites() {
    const backend =
      process.env.BASE_URL_LOCAL || process.env.BASE_URL_PRODUCTION || 'http://127.0.0.1:8000';
    return [
      {
        source: '/uploads/:path*',
        destination: `${backend}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
