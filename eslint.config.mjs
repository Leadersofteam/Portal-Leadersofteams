import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

// Granice modularnego monolitu (ADR-002): import z innego modułu wyłącznie
// przez jego publiczne API (modules/<x>/index.ts), nigdy z wnętrza.
const API_MODULES = [
  'identity',
  'marketplace',
  'groups',
  'community',
  'teams',
  'ladder',
  'antifraud',
  'notifications',
  'integration',
  // Dopisane w S11: te moduły powstały po ustaleniu listy i przez pewien czas
  // NIE były pilnowane przez import/no-restricted-paths — czyli granica ADR-002
  // istniała dla nich wyłącznie w dobrych intencjach.
  'social',
  'listings',
  'files',
  'search',
  // Dopisany w S12 RAZEM z modułem, nie po fakcie — patrz notka wyżej: moduł
  // spoza tej listy ma granicę ADR-002 wyłącznie w dobrych intencjach.
  'analytics',
];

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/prisma/generated/**',
      '**/next-env.d.ts',
      // katalog roboczy narzędzia (git worktree Claude'a) — poza repo od
      // 8eafa78, ale na dysku istnieje i lint bez tego wpisu po nim chodzi
      '.claude/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Service worker żyje poza oknem przeglądarki — ma własne globalne API
    // (self/caches/clients), których nie zna ani config przeglądarki, ani Node.
    files: ['apps/web/public/sw.js'],
    languageOptions: {
      globals: {
        self: 'readonly',
        caches: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
      },
    },
  },
  {
    // Skrypty narzędziowe uruchamiane ręcznie przez Node (generator ikon PWA).
    files: ['**/scripts/**/*.mjs'],
    languageOptions: {
      globals: { Buffer: 'readonly', console: 'readonly', process: 'readonly' },
    },
  },
  {
    files: ['apps/api/src/**/*.ts'],
    plugins: { import: importPlugin },
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: API_MODULES.map((mod) => ({
            target: `./apps/api/src/modules/${mod}`,
            from: './apps/api/src/modules',
            except: [mod, ...API_MODULES.filter((m) => m !== mod).map((m) => `${m}/index.ts`)],
            message:
              'Granica modułu (ADR-002): importuj wyłącznie z publicznego API modułu (modules/<x>/index.ts).',
          })),
        },
      ],
    },
  },
  prettier,
);
