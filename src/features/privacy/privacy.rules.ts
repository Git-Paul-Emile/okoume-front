import type { Order } from '@/features/orders/orders.types';
import type { PrivacyRequest, PrivacyRequestStatus, PrivacyRequestType } from './privacy.types';

export const privacyTypeLabel: Record<PrivacyRequestType, string> = {
  access: 'Accès aux données',
  export: 'Export des données',
  correction: 'Correction',
  deletion: 'Suppression du compte',
};

export const privacyStatusLabel: Record<PrivacyRequestStatus, string> = {
  received: 'Reçue',
  in_progress: 'En cours',
  completed: 'Traitée',
  refused: 'Refusée',
};

export const isOverdue = (r: PrivacyRequest, now: number) =>
  (r.status === 'received' || r.status === 'in_progress') && now > new Date(r.dueAt).getTime();

/** Une commande en cours empêche la suppression : elle doit d'abord être livrée ou annulée. */
export const deletionBlockers = (orders: Order[]) =>
  orders.filter((o) => !['delivered', 'cancelled'].includes(o.status) || o.paymentStatus === 'refund_due');
