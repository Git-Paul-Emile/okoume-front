import type { PaymentMethod } from '@/features/orders/orders.types';

/** Libellé court du moyen de paiement, pour les tableaux. */
export const shortMethod: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  airtel: 'Airtel Money',
  moov: 'Moov Money',
};
