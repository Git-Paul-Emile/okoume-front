import { recordEvent } from '@/features/analytics/analytics.api';

const seen = new Set<string>();

/**
 * Consultations et clics sur les produits (18.1), pour les statistiques : anonymes, une fois par visite,
 * et seulement avec le consentement à la mesure d'audience (18.2).
 */
export function recordProductView(productId: string, kind: 'view' | 'click') {
  const key = `${kind}:${productId}`;
  if (seen.has(key)) return;
  seen.add(key);
  recordEvent({ kind: kind === 'view' ? 'product_view' : 'product_click', productId });
}
