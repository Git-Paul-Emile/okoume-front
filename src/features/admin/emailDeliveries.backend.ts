import { z } from 'zod';
import { backend, getAll } from '@/api/backend';

/**
 * Suivi des e-mails sur l'API (api/src/features/email-deliveries) : chaque envoi du worker, ses essais et son
 * issue. Le texte n'est jamais montré ; un e-mail contenant un code ou un lien d'accès ne se relance pas.
 */

const deliveryDto = z.object({
  id: z.string(),
  to: z.string(),
  subject: z.string(),
  status: z.enum(['sending', 'sent', 'failed', 'retried']),
  attempts: z.number(),
  lastError: z.string().nullable(),
  retryable: z.boolean(),
  sentAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Delivery = z.infer<typeof deliveryDto>;

export const emailDeliveriesBackend = {
  list: (signal?: AbortSignal) => getAll('/staff/emails', {}, (raw) => deliveryDto.parse(raw), signal),
  retry: (id: string) => backend.post(`/staff/emails/${id}/retries`),
};
