import type { OrderStatus, PaymentMethod, PaymentStatus } from './orders.types';

/** Cycle de référence d'une commande (hors états d'exception). */
export const ORDER_FLOW: OrderStatus[] = [
  'confirmed',
  'preparing',
  'ready',
  'courier_assigned',
  'shipping',
  'delivered',
];

export const orderStatusLabel: Record<OrderStatus, string> = {
  confirmed: 'Commande confirmée',
  preparing: 'En préparation',
  ready: 'Prête à livrer',
  courier_assigned: 'Livreur trouvé',
  shipping: 'En cours de livraison',
  delivered: 'Livrée',
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  awaiting_payment: 'En attente de paiement',
  paid: 'Payé',
};

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  cash: 'Espèces à la livraison',
  airtel: 'Airtel Money',
  moov: 'Moov Money',
};

export const CANCEL_REASONS = [
  'Changement d’avis',
  'Erreur dans la commande',
  'Retard de livraison',
  'Produit indisponible',
  'Autre motif',
];
export const RETURN_REASONS = [
  'Produit endommagé',
  'Produit défectueux',
  'Non conforme à la description',
  'Erreur de taille ou de variante',
  'Autre motif',
];

/** L'annulation directe n'est possible qu'avant le début de la préparation. */
export const canCancelDirectly = (status: OrderStatus) => status === 'confirmed';

/**
 * Numéro de commande tel que l'API le génère (CMD-2026-7KQ4XM, 6 caractères lisibles) ; les commandes de
 * départ gardent leurs 5 chiffres (CMD-2026-00147). Même règle que l'API (support.schemas.ts).
 */
export const ORDER_NUMBER_PATTERN = /^(?:CMD|PAN)-\d{4}-[A-Z0-9]{5,6}$/i;
export const ORDER_NUMBER_EXAMPLE = 'CMD-2026-7KQ4XM';
