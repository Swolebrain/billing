/// <reference types="vitest" />
import * as path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    test: {
        alias: {
            '@billing/core': path.resolve(__dirname, '..', 'core', 'src'),
        },
        testTimeout: 15 * 1000,
        threads: false,
    },
});
