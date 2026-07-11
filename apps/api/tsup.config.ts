import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts', 'src/worker.ts'],
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  clean: true,
  // Zależności natywne / z własnym ładowaniem zostają w node_modules obrazu.
  external: ['@prisma/client', 'argon2'],
  // Wewnętrzne paczki workspace (źródło TS) MUSZĄ być wbudowane w dist — inaczej
  // czysty Node w produkcji próbuje ładować .ts z node_modules i pada
  // (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING).
  noExternal: [/^@lot\//],
});
