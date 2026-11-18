import { recordEvent } from '@/features/analytics/analytics.api';
import { normalizeTerm } from './searchLog';

const seen = new Set<string>();

/**
 * Termes recherchés (18.1) : mesure d'audience non essentielle, donc seulement avec le consentement.
 * Une même recherche n'est comptée qu'une fois par visite.
 */
export function recordSearch(term: string, results: number) {
  const t = normalizeTerm(term);
  if (t.length < 2 || seen.has(t)) return;
  seen.add(t);
  recordEvent({ kind: 'search', term: t.slice(0, 80), results });
}
