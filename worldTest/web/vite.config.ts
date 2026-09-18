import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const srcDir = fileURLToPath(new URL('../../src', import.meta.url));
const srcIndex = fileURLToPath(new URL('../../src/index.ts', import.meta.url));
const coreDir = fileURLToPath(new URL('../core', import.meta.url));
const coreIndex = fileURLToPath(new URL('../core/index.ts', import.meta.url));

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: [
            { find: /^@core$/, replacement: coreIndex },
            { find: /^@core\//, replacement: coreDir + '/' },
            { find: /^@rpg$/, replacement: srcIndex },
            { find: /^@rpg\//, replacement: srcDir + '/' },
        ],
    },
    server: {
        host: true,
        port: 5173,
        fs: { allow: ['../..'] },
        allowedHosts: ["desktop-vc3b2pk.tailafbbc4.ts.net"]
    },
});
