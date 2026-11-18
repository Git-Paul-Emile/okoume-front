/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string;
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Commit déployé (VERCEL_GIT_COMMIT_SHA au build), vide en local */
declare const __APP_RELEASE__: string;
