import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
  },
  format: ['cjs'],
  target: 'node20',
  clean: true,
  splitting: false,
  minify: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
  outDir: 'dist',
});
