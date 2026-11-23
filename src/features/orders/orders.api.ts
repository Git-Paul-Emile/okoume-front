import type { Id } from '@/api/types';
import { ordersBackend } from './orders.backend';
import type { CancellationRequest, Order, ReturnRequest } from './orders.types';

/** Demande de retour, avec les photos qui justifient un produit abîmé. */
export type ReturnInput = Omit<ReturnRequest, 'status' | 'createdAt'> & { evidenceUrls?: string[] };

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
  /** Commande passée sans compte, ajoutée au compte connecté */
  claim: (number: string, code: string, userId: Id) => ordersBackend.claim(number, code, userId),
  requestCancellation: (order: Order, request: Omit<CancellationRequest, 'status' | 'createdAt'>) =>
    ordersBackend.cancel(order, request.reason, request.comment),
  requestReturn: (order: Order, { evidenceUrls = [], ...request }: ReturnInput) =>
    ordersBackend.requestReturn(order, {
      items: request.items,
      reason: request.reason,
      comment: request.comment,
      evidenceUrls,
    }),
  /** Contestation : ouvre une réclamation prioritaire sans modifier le statut « Livrée ». */
  disputeDelivery: (order: Order, message: string) => ordersBackend.disputeDelivery(order, message),
  /** Réouverture d'un retour refusé : le dossier initial est conservé, une demande est transmise à l'équipe. */
  reopenReturn: (order: Order, message: string) => ordersBackend.reopenReturn(order, message),
};
