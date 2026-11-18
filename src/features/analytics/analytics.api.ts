import { backend } from '@/api/backend';
import { canMeasureAudience } from '@/stores/consentStore';

export type AudienceEvent =
  | { kind: 'visit'; pwa: boolean }
  | { kind: 'product_view' | 'product_click' | 'add_to_cart'; productId: string }
  | { kind: 'search'; term: string; results: number }
  | { kind: 'checkout' };

/**
 * Mesure d'audience (18.1) : événements anonymes, envoyés seulement avec le consentement (18.2). Un échec n'est
 * jamais montré au visiteur : la mesure ne doit pas gêner l'achat.
 */
export function recordEvent(event: AudienceEvent) {
  if (!canMeasureAudience()) return;
  void backend.post('/analytics/events', event).catch(() => undefined);
}

let visitRecorded = false;

/** Une visite par chargement de l'application, en signalant l'application installée. */
export function recordVisit() {
  if (visitRecorded) return;
  visitRecorded = true;
  recordEvent({ kind: 'visit', pwa: window.matchMedia('(display-mode: standalone)').matches });
}
