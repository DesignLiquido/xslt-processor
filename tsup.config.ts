import { defineConfig } from 'tsup';

export default defineConfig([
    // CJS and ESM builds for Node.js / module bundlers
    {
        entry: ['src/index.ts'],
        format: ['cjs', 'esm'],
        outDir: 'dist',
        dts: true,
        sourcemap: true,
        clean: true,
        target: 'es2015',
        splitting: false,
    },
    // IIFE build for browsers (replaces UMD)
    {
        entry: { 'xslt-processor': 'src/index.ts' },
        format: ['iife'],
        outDir: 'dist/umd',
        globalName: 'XsltProcessor',
        sourcemap: true,
        minify: true,
        target: 'es2015',
    },
]);
