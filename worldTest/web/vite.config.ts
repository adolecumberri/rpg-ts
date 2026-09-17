import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const srcDir = fileURLToPath(new URL('../../src', import.meta.url));
const srcIndex = fileURLToPath(new URL('../../src/index.ts', import.meta.url));

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: [
            { find: /^@rpg$/, replacement: srcIndex },
            { find: /^@rpg\//, replacement: srcDir + '/' },
        ],
    },
    server: {
        host: true,
        port: 5173,
        fs: { allow: ['../..'] },
    },
});
