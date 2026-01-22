import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
    },
  },
});