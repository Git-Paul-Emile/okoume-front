import type { Id } from '@/api/types';

export type OrderStatus =
  'confirmed' | 'preparing' | 'ready' | 'courier_assigned' | 'shipping' | 'delivered' | 'cancelled' | 'claim';
export type PaymentStatus =
  'awaiting_payment' | 'awaiting_verification' | 'partially_paid' | 'paid' | 'refund_due' | 'refunded';
export type PaymentMethod = 'cash' | 'airtel' | 'moov';

export interface OrderItem {
  productId: Id;
  variantId: Id;
  name: string;
  variantLabel: string;
  image: string;
  unitPrice: number;
  originalPrice: number;
  quantity: number;
}

export interface OrderCustomer {
  recipient: string;
  phone: string;
  email: string;
  zoneId: Id;
  zoneName: string;
  landmark: string;
  instructions: string;
}

export interface OrderTotals {
  subtotal: number;
  productDiscount: number;
  codeDiscount: number;
  deliveryFee: number;
  deliveryDiscount: number;
  total: number;
}

export interface CancellationRequest {
  reason: string;
  comment: string;
  status: 'pending' | 'accepted' | 'refused';
  createdAt: string;
  decisionReason?: string;
}

export interface ReturnRequest {
  /** Identifiant du dossier sur l'API, pour les actions de l'équipe */
  id?: Id;
  items: Array<{ variantId: Id; quantity: number }>;
  reason: string;
  comment: string;
  status:
    'pending' | 'accepted' | 'refused' | 'expected' | 'received' | 'refund_due' | 'refunded' | 'closed';
  createdAt: string;
  decisionReason?: string; /** Demande de réouverture après un refus (14.6). */
  reopenRequestedAt?: string;
}

/**
 * Réclamation sur une livraison centralisée par Okoumé. Les commandes livrées par le vendeur sont exclues.
 */
export interface DeliveryDispute {
  createdAt: string;
  ticketNumber?: string;
  status?: 'open' | 'resolved';
  resolution?: string | null;
}

export interface Order {
  id: Id;
  number: string;
  trackingCode: string;
  userId: Id | null;
  items: OrderItem[];
  customer: OrderCustomer;
  totals: OrderTotals;
  promoCode: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  /** Étapes de la commande (6.3) : nouvel état, état précédent, date, auteur et motif éventuel. */
  history: Array<{ status: OrderStatus; at: string; note?: string; from?: OrderStatus; by?: string }>;
  cancellationRequest: CancellationRequest | null;
  returnRequest: ReturnRequest | null;
  deliveryDispute?: DeliveryDispute | null;
  /** Boutique qui vend (32.4) ; null pour la boutique Okoumé */
  shop: { slug: string; name: string } | null;
  /** Passage en caisse commun aux commandes d'un même panier */
  checkoutNumber: string | null;
  /** Qui livre (32.5) : les livreurs Okoumé ou le vendeur */
  fulfilledBy: 'okoume' | 'seller';
  /** Confirmation de remise au livreur pour cet arrêt de la tournée centralisée */
  collectionConfirmedAt: string | null;
  collectionConfirmedBy: string | null;
  /** Juste après la commande : toutes les commandes du même panier, celle-ci comprise */
  checkout?: Order[];
  /** Sous-commandes agrégées pour le suivi global sans compte */
  trackedOrders?: Array<{
    number: string;
    shopName: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    fulfilledBy: 'okoume' | 'seller';
    total: number;
    collectionConfirmedAt: string | null;
  }>;
  createdAt: string;
}
