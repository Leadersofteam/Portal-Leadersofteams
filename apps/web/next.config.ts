import type { NextConfig } from 'next';

// Wewnętrzny adres API (w docker compose: http://api:3001).
const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@lot/contracts'],
  async rewrites() {
    // Cały ruch API idzie przez origin webu (same-origin cookies, zero CORS).
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
