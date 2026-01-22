import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['node_modules', 'dist'],
    reporters: ['default', 'html'],
    outputFile: {
      html: 'reports/vitest/index.html',
    },
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      reportsDirectory: 'reports/coverage',
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
    },
  },
});