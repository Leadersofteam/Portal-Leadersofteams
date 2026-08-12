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
  async headers() {
    // Service worker musi być zawsze świeży (inaczej stary SW zostaje na
    // zawsze) i mieć prawo do zakresu '/' mimo serwowania z /sw.js.
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
