import { can } from './permissions';
import { ORDER_FLOW } from '@/features/orders/orders.constants';
import type { OrderStatus, ReturnRequest } from '@/features/orders/orders.types';
import type { AdminOrder } from './admin.types';

/**
 * Règles de traitement des commandes côté équipe, pour l'affichage et le contrôle avant envoi ;
 * c'est l'API qui applique et vérifie chaque transition.
 */

export function nextStatus(status: OrderStatus): OrderStatus | null {
  const i = ORDER_FLOW.indexOf(status);
  return i >= 0 && i < ORDER_FLOW.length - 1 ? ORDER_FLOW[i + 1] : null;
}

export const nextStatusAction: Partial<Record<OrderStatus, string>> = {
  confirmed: 'Commencer la préparation',
  preparing: 'Marquer prête à livrer',
  ready: 'Assigner un livreur',
  courier_assigned: 'Marquer en livraison',
  shipping: 'Marquer livrée',
};

export const canReopen = (who: Parameters<typeof can>[0]) => can(who, 'commandes:valider');

/**
 * Trace des modifications (6.3) : chaque nouvelle entrée de l'historique reçoit l'état précédent et son auteur.
 * L'historique existant n'est jamais réécrit.
 */
export function stampHistory(order: AdminOrder, patch: Partial<AdminOrder>, by: string): Partial<AdminOrder> {
  if (!patch.history || patch.history.length <= order.history.length) return patch;
  const added = patch.history.slice(order.history.length).map((h) => ({ from: order.status, by, ...h }));
  return { ...patch, history: [...order.history, ...added] };
}

export function advancePatch(order: AdminOrder, now = new Date().toISOString(), note?: string): Partial<AdminOrder> {
  const next = nextStatus(order.status);
  if (!next) throw new Error('Cette commande ne peut plus avancer.');
  return {
    status: next,
    // Tout se paie à la livraison : l'encaissement est confirmé séparément par une personne autorisée (8.5)
    history: [...order.history, { status: next, at: now, ...(note ? { note } : {}) }],
  };
}

/** Le retour reçu passe directement à l'étape de remboursement. */
export const RETURN_STEPS: Array<{ from: ReturnRequest['status']; to: ReturnRequest['status']; label: string }> = [
  { from: 'accepted', to: 'refund_due', label: 'Confirmer la réception du retour' },
];

/** Seul l'administrateur principal accepte ou refuse un retour (28.6). */
export const canDecideReturn = (who: Parameters<typeof can>[0]) => can(who, 'retours:valider');

export const DELIVERY_FAILURE_REASONS = [
  'Client absent ou injoignable',
  'Adresse ou repère introuvable',
  'Colis refusé par le client',
  'Paiement en espèces impossible',
  'Incident pendant la livraison',
];
