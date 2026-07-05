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
];

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/prisma/generated/**',
      '**/next-env.d.ts',
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
