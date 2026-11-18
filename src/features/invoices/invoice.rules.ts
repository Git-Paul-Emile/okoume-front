import type { Id } from '@/api/types';
import type { PaymentMethod } from '@/features/orders/orders.types';

export interface InvoiceLine {
  label: string;
  detail?: string;
  quantity: number;
  /** Prix unitaire TTC. */
  unit: number;
  vatRate: number;
  ttc: number;
}

/** Facture ou avoir (25.4) : document figé, jamais modifié ni supprimé après émission. */
export interface InvoiceDocument {
  id: Id;
  number: string;
  type: 'invoice' | 'credit_note';
  orderId: Id;
  orderNumber: string;
  userId: Id | null;
  issuedAt: string;
  customer: { name: string; phone: string; email: string; address: string };
  paymentMethod: PaymentMethod;
  lines: InvoiceLine[];
  vatBreakdown: Array<{ rate: number; ht: number; vat: number; ttc: number }>;
  totals: { ht: number; vat: number; ttc: number };
  /** Avoir : facture d'origine et motif. */
  relatedNumber?: string;
  reason?: string;
}
