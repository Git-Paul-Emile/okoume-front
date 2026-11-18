import { can, isOwner } from './permissions';
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

/** Un changement de frais en attente de l'accord du client bloque la poursuite de la livraison (9.5). */
export const feeChangeBlocks = (order: AdminOrder) =>
  order.deliveryFeeChange?.status === 'pending' && ['ready', 'courier_assigned'].includes(order.status);

export function advancePatch(order: AdminOrder, now = new Date().toISOString(), note?: string): Partial<AdminOrder> {
  const next = nextStatus(order.status);
  if (!next) throw new Error('Cette commande ne peut plus avancer.');
  if (feeChangeBlocks(order))
    throw new Error(
      'Nouveaux frais de livraison en attente de l’accord du client : la livraison ne peut pas continuer.',
    );
  return {
    status: next,
    // Tout se paie à la livraison : l'encaissement est confirmé séparément par une personne autorisée (8.5)
    history: [...order.history, { status: next, at: now, ...(note ? { note } : {}) }],
  };
}

/** Étapes d'un retour accepté, jusqu'au remboursement. */
/**
 * Étapes d'un retour accepté (14.3, 28.6) : le remboursement n'est possible qu'après réception
 * puis inspection du produit.
 */
export const RETURN_STEPS: Array<{ from: ReturnRequest['status']; to: ReturnRequest['status']; label: string }> = [
  { from: 'accepted', to: 'received', label: 'Marquer le colis reçu' },
];

export type InspectionLine = { variantId: string; resaleable: number; unsellable: number };

/**
 * Inspection après réception (14.3) : chaque article retourné est classé revendable ou non revendable.
 * Le remboursement devient possible ; la remise en stock des revendables attend une validation du stock.
 */
export function inspectionPatch(
  order: AdminOrder,
  lines: InspectionLine[],
  note: string,
  by: string,
  now = new Date().toISOString(),
): Partial<AdminOrder> {
  const request = order.returnRequest;
  if (!request || request.status !== 'received') throw new Error('Le colis doit avoir été reçu pour être inspecté.');
  for (const item of request.items) {
    const line = lines.find((l) => l.variantId === item.variantId);
    const total = (line?.resaleable ?? 0) + (line?.unsellable ?? 0);
    if (!line || line.resaleable < 0 || line.unsellable < 0 || total !== item.quantity)
      throw new Error('Classez chaque article retourné : revendable ou non revendable, pour la quantité reçue.');
  }
  const resaleable = lines.some((l) => l.resaleable > 0);
  return {
    returnRequest: {
      ...request,
      status: 'refund_due',
      inspection: { lines, note: note.trim(), by, at: now },
      ...(resaleable ? { restock: { status: 'pending' as const } } : {}),
    },
    paymentStatus: 'refund_due',
  };
}

/** Remise en stock validée par l'administrateur principal ou un employé autorisé au stock (14.3). */
export const canRestock = (who: Parameters<typeof can>[0]) => can(who, 'stock:valider');

/** Sortie définitive d'un article non revendable : décision de l'administrateur principal (14.3). */
export const canWriteOff = (who: Parameters<typeof can>[0]) => isOwner(who);

/** Seul l'administrateur principal accepte ou refuse un retour (28.6). */
export const canDecideReturn = (who: Parameters<typeof can>[0]) => can(who, 'retours:valider');

export const DELIVERY_FAILURE_REASONS = [
  'Client absent ou injoignable',
  'Adresse ou repère introuvable',
  'Colis refusé par le client',
  'Paiement en espèces impossible',
  'Incident pendant la livraison',
];
