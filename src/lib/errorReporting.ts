/**
 * Remontée des erreurs du navigateur vers l'outil de supervision (rules/20-qualite/observability.md).
 * Le reste du site ne connaît que `reportError` ; Sentry n'est chargé que si VITE_SENTRY_DSN est défini,
 * pour ne pas alourdir le site quand la supervision est absente (développement, tests).
 */
type Capture = (error: unknown) => void;

let capture: Capture | null = null;
const pending: unknown[] = [];

export function reportError(error: unknown) {
  if (capture) capture(error);
  else if (pending.length < 10) pending.push(error);
}

/** Démarre la supervision ; sans DSN, les erreurs restent dans la console du navigateur. */
export async function startErrorReporting(dsn: string | undefined, release: string | undefined) {
  if (!dsn) {
    pending.length = 0;
    return;
  }
  const Sentry = await import('@sentry/react');
  Sentry.init({
    dsn,
    release,
    environment: import.meta.env.MODE,
    // Aucune donnée personnelle ni de requête : l'erreur, sa pile et la page suffisent
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    tracesSampleRate: 0,
  });
  capture = (error) => Sentry.captureException(error);
  pending.splice(0).forEach(capture);
}
