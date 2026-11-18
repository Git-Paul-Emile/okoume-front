import type { AdminOrder } from './admin.types';
import { advancePatch, nextStatus, stampHistory } from './orders.actions';

export interface BulkPlan {
  ready: Array<{ order: AdminOrder; patch: Partial<AdminOrder> }>;
  skipped: Array<{ number: string; reason: string }>;
}

/**
 * Changement de statut groupé (6.2) : chaque commande passe les mêmes contrôles qu'une par une
 * (paiement vérifié, accord sur les frais). L'assignation d'un livreur reste individuelle.
 */
export function bulkAdvancePlan(selected: AdminOrder[], by: string, now = new Date().toISOString()): BulkPlan {
  const plan: BulkPlan = { ready: [], skipped: [] };
  for (const order of selected) {
    const next = nextStatus(order.status);
    if (!next) {
      plan.skipped.push({ number: order.number, reason: 'ne peut plus avancer' });
      continue;
    }
    if (order.status === 'ready') {
      plan.skipped.push({ number: order.number, reason: 'livreur à choisir commande par commande' });
      continue;
    }
    try {
      plan.ready.push({ order, patch: stampHistory(order, advancePatch(order, now), by) });
    } catch (e) {
      plan.skipped.push({ number: order.number, reason: (e as Error).message });
    }
  }
  return plan;
}
