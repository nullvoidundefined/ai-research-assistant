import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['src/__integration__/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts', 'src/__integration__/**'],
    },
  },
  resolve: {
    alias: {
      app: path.resolve(__dirname, 'src'),
    },
  },
});
