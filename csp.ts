import type { Plugin } from 'vite';

/** Origines d'images des données de départ ; les visuels importés (npm run media:import) sont sur Cloudinary. */
const IMAGE_HOSTS = ['https://res.cloudinary.com', 'https://cdn.dummyjson.com', 'https://images.unsplash.com'];

const originOf = (url: string | undefined) => {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

/**
 * Politique de sécurité du contenu (rules/20-qualite/security.md), écrite dans index.html au build. Elle
 * dépend de l'environnement (adresse de l'API, Sentry) : un en-tête fixe dans vercel.json ne le pourrait pas.
 * Scripts du site seulement ; styles en ligne permis (bibliothèques d'interface et d'animation).
 * frame-ancestors n'est pas accepté dans une balise meta : X-Frame-Options (vercel.json) le remplace.
 */
export function contentSecurityPolicy(env: { backendUrl?: string; sentryDsn?: string }): Plugin {
  return {
    name: 'okoume-csp',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: buildPolicy(env) },
        injectTo: 'head-prepend',
      },
    ],
  };
}

/** Politique complète ; vérifiée seulement au build (les tests et le serveur de développement n'en ont pas besoin). */
export function buildPolicy(env: { backendUrl?: string; sentryDsn?: string }) {
  const backend = originOf(env.backendUrl);
  if (!backend) throw new Error('CSP : VITE_BACKEND_URL absente ou invalide');
  const sentry = originOf(env.sentryDsn);
  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', ...IMAGE_HOSTS],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", backend, 'https://api.cloudinary.com', ...(sentry ? [sentry] : [])],
    'worker-src': ["'self'"],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  };
  const policy = Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ');
  return policy;
}
