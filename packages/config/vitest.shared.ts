import { defineConfig } from 'vitest/config';

export const sharedConfig = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      lines: 95,
      functions: 95,
      branches: 95,
      statements: 95,
    },
  },
});
