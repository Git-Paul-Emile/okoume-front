import { adminCommerceBackend } from '@/features/admin/adminCommerce.backend';
import type { InvoiceDocument } from './invoice.rules';

/** Factures et avoirs sont émis et numérotés par le serveur, dans une transaction qui garantit l'unicité. */
export const invoicesApi = {
  /** Tous les documents (équipe). */
  all: (signal?: AbortSignal): Promise<InvoiceDocument[]> => adminCommerceBackend.invoices(signal),
};
