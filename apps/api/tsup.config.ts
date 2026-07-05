import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts', 'src/worker.ts'],
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  clean: true,
  // Zależności natywne / z własnym ładowaniem zostają w node_modules obrazu.
  external: ['@prisma/client', 'argon2'],
});
