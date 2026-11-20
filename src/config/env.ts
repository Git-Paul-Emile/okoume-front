import { z } from 'zod';

const envSchema = z.object({
  /** API Okoumé (dossier api/), sans /api/v1. Obligatoire : toutes les données viennent de l'API. */
  VITE_BACKEND_URL: z
    .string()
    .url({ message: 'VITE_BACKEND_URL doit être une URL valide (ex. http://localhost:3000)' }),
  /** Supervision des erreurs (Sentry) ; vide : aucune remontée */
  VITE_SENTRY_DSN: z.preprocess((v) => (v === '' ? undefined : v), z.string().url().optional()),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  console.error('Variables d’environnement invalides :', parsed.error.flatten().fieldErrors);
  throw new Error('Configuration invalide : vérifiez le fichier .env (voir .env.example).');
}

const useSameOriginApi =
  typeof window !== 'undefined' &&
  (__VERCEL_API_PROXY__ || window.location.hostname.endsWith('.vercel.app'));
const backendOrigin = useSameOriginApi ? window.location.origin : parsed.data.VITE_BACKEND_URL.replace(/\/$/, '');

export const env = {
  /** Origine de l'API (même origine via Vercel en production, service direct en local) */
  backendOrigin,
  /** Adresse de l'API Okoumé, versionnée */
  backendUrl: `${backendOrigin}/api/v1`,
  sentryDsn: parsed.data.VITE_SENTRY_DSN,
};
