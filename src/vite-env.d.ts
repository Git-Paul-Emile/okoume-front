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
/** API proxifiée sous l'origine du site sur Vercel pour partager les cookies de session. */
declare const __VERCEL_API_PROXY__: boolean;
/** Mot de passe des comptes de dÃ©monstration, injectÃ© uniquement par le serveur Vite de dÃ©veloppement. */
declare const __OKOZA_DEMO_PASSWORD__: string;
