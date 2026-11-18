import { env } from '@/config/env';
import type { ChatMessage } from './marketplace.backend';

/** Distance arrondie publiée par l'API (32.4) : jamais la position exacte du vendeur. */
export const distanceLabel = (km: number) =>
  km < 1 ? 'À moins de 1 km' : `À environ ${km.toLocaleString('fr-FR')} km`;

/**
 * Lien à partager (32.9). Il passe par la page d'aperçu de l'API, qui montre titre, photo et prix sur
 * WhatsApp et Facebook, puis renvoie vers l'annonce.
 */
export function shareLink(slug: string, origin = window.location.origin) {
  const api = env.backendUrl?.replace(/\/api\/v1$/, '');
  return api ? `${api}/partage/annonces/${slug}` : `${origin}/annonces/${slug}`;
}

/** Ajoute les nouveaux messages, sans doublon, dans l'ordre chronologique. */
export function mergeMessages(current: readonly ChatMessage[], incoming: readonly ChatMessage[]): ChatMessage[] {
  const byId = new Map(current.map((m) => [m.id, m] as const));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
