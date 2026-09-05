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
    //
    // Nagłówki bezpieczeństwa (PL0): API ma helmet, a web NIE MIAŁ NIC —
    // `curl -I https://leadersofteams.pl/uslugi` (04.09) pokazał sam
    // cache-control. Traefik ich nie dokłada. Świadomie BEZ pełnego CSP:
    // Portal ma skrypty inline (boot motywu, JSON-LD, rejestracja SW), więc
    // CSP wymagałby nonce'ów w każdym z nich — osobna zmiana z własnym
    // pomiarem, nie „przy okazji". `frame-ancestors` wchodzi jako minimum,
    // bo to jedyna dyrektywa, której X-Frame-Options nie zastępuje w pełni.
    const security = [
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
      // strict-origin-when-cross-origin: pełny URL tylko do własnej domeny —
      // link z wątku oferty kliknięty na obcą stronę nie zdradza adresu wątku.
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];
    return [
      { source: '/(.*)', headers: security },
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
