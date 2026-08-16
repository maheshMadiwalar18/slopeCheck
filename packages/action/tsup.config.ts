import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'node20',
  clean: true,
  noExternal: [/(.*)/], // Bundle all dependencies into the final JS file
  minify: false,
});
