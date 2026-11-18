import { orderStatusLabel, paymentStatusLabel } from '@/features/orders/orders.constants';
import type { OrderStatus, PaymentStatus } from '@/features/orders/orders.types';
import { cn } from '@/utils/text';

type Tone = 'forest' | 'neutral' | 'warning' | 'danger';

/**
 * Statuts du back-office : texte coloré sans fond, sauf les statuts neutres (gris) qui gardent
 * leur pastille pour rester lisibles. Le libellé porte le sens, la couleur ne fait que l'appuyer.
 */
const toneClass: Record<Tone, string> = {
  forest: 'text-forest',
  neutral: 'rounded-sm bg-sage px-2 py-0.5 text-ink',
  warning: 'text-warning',
  danger: 'text-danger',
};

const orderTone: Record<OrderStatus, Tone> = {
  confirmed: 'warning',
  preparing: 'neutral',
  ready: 'neutral',
  courier_assigned: 'neutral',
  shipping: 'neutral',
  delivered: 'forest',
  cancelled: 'danger',
  claim: 'danger',
};

const paymentTone: Record<PaymentStatus, Tone> = {
  awaiting_payment: 'neutral',
  awaiting_verification: 'warning',
  partially_paid: 'warning',
  paid: 'forest',
  refund_due: 'danger',
  refunded: 'neutral',
};

/** Statut générique : actif, inactif, en attente… */
export const StateBadge = ({ tone, children }: { tone: Tone; children: string }) => (
  <span className={cn('inline-block text-xs font-semibold whitespace-nowrap', toneClass[tone])}>{children}</span>
);

export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => (
  <StateBadge tone={orderTone[status]}>{orderStatusLabel[status]}</StateBadge>
);

export const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => (
  <StateBadge tone={paymentTone[status]}>{paymentStatusLabel[status]}</StateBadge>
);
