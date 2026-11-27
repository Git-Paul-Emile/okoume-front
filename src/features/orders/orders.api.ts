import type { Id } from '@/api/types';
import { ordersBackend } from './orders.backend';

/**
   * Démarches disponibles après commande. Celles d'une commande passée sans compte demandent une session.
 */
export const ordersApi = {
  /** Suivi invité : numéro de commande + code temporaire. */
  track: (number: string, code: string) => ordersBackend.track(number, code),
  /** Seule une commande du compte connecté se relit par son numéro (suivi invité : track). */
  byNumber: async (number: string, userId: Id | null, signal?: AbortSignal) =>
    userId ? ordersBackend.byNumber(number, userId, signal) : null,
  /**
   * Commandes visibles dans le compte : celles des 3 dernières années (fenêtre opérationnelle).
   * Les plus anciennes restent dans les archives comptables de la boutique, pas dans le compte.
   */
  forUser: (userId: Id, signal?: AbortSignal) => ordersBackend.mine(userId, signal),
};
