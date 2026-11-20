/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { contentSecurityPolicy } from './csp';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [
      react(),
      tailwindcss(),
      contentSecurityPolicy({
        backendUrl: env.VITE_BACKEND_URL,
        sentryDsn: env.VITE_SENTRY_DSN,
        enableVercelToolbar: process.env.VERCEL === '1',
      }),
    ],
    // Version déployée, pour relier une erreur remontée à sa mise en ligne (fournie par Vercel au build)
    define: { __APP_RELEASE__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA ?? '') },
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
    },
    build: {
      rollupOptions: {
        output: {
          // Bibliothèques séparées du code applicatif : meilleur cache navigateur entre deux déploiements
          manualChunks: {
            react: ['react', 'react-dom', 'react-router'],
            data: ['@tanstack/react-query', 'zustand', 'zod'],
            motion: ['motion'],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      // Les parcours de bout en bout (e2e/) tournent avec Playwright : npm run test:e2e
      include: ['src/**/*.test.{ts,tsx}'],
    },
  };
});
