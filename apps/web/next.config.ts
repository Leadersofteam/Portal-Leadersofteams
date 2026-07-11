import type { NextConfig } from 'next';

// Wewnętrzny adres API (w docker compose: http://api:3001).
const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@lot/contracts'],
  // Socket.IO nasłuchuje pod ścieżką z końcowym ukośnikiem (/api/socket.io/).
  // Bez tego Next robi 308 usuwając ukośnik → handshake trafia w 404. Wyłączamy
  // auto-redirect, żeby rewrite proxował ścieżkę 1:1 do api.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    // Cały ruch API idzie przez origin webu (same-origin cookies, zero CORS).
    // Dokładna reguła socket.io PRZED ogólną: zachowuje literalny końcowy ukośnik
    // (/api/socket.io/), którego ogólny `:path*` nie odtwarza → handshake engine.io.
    return [
      { source: '/api/socket.io/', destination: `${apiUrl}/api/socket.io/` },
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
    ];
  },
};

export default nextConfig;
