import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@libsql/client', 'libsql'],
  experimental: { serverActions: { bodySizeLimit: '2mb' } },
  poweredByHeader: false,
};

export default nextConfig;
