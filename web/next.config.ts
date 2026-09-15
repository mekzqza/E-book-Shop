import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone', // self-contained server for the Docker image; Vercel ignores it
  poweredByHeader: false,
};

export default nextConfig;
