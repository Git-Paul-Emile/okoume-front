import type { Id } from '@/api/types';
import { ordersBackend } from './orders.backend';
import type { CancellationRequest, Order, PaymentMethod, ReturnRequest } from './orders.types';

/** Demande de retour, avec les photos qui justifient un produit abîmé. */
export type ReturnInput = Omit<ReturnRequest, 'status' | 'createdAt'> & { evidenceUrls?: string[] };

/**
 * Démarches après commande. Celles d'une commande passée sans compte demandent une session, et le changement
 * de paiement s'applique tout de suite, sans accord de la boutique.
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
  requestPaymentChange: (order: Order, to: PaymentMethod) => ordersBackend.changePaymentMethod(order, to),
  /** Paiement Mobile Money déclaré : depuis le compte, ou sans compte avec le code de suivi. */
  declarePayment: (order: Order, reference: string, trackingCode?: string) =>
    trackingCode
      ? ordersBackend.declarePaymentByTracking(order.number, trackingCode, reference)
      : ordersBackend.declarePayment(order, reference),
  /** Réponse du client aux nouveaux frais de livraison proposés par la boutique (9.5). */
  decideFeeChange: (order: Order, accept: boolean) => ordersBackend.decideFeeChange(order, accept),
  /** Contestation : ouvre une réclamation prioritaire sans modifier le statut « Livrée ». */
  disputeDelivery: (order: Order, message: string) => ordersBackend.disputeDelivery(order, message),
  /** Réouverture d'un retour refusé : le dossier initial est conservé, une demande est transmise à l'équipe. */
  reopenReturn: (order: Order, message: string) => ordersBackend.reopenReturn(order, message),
};
