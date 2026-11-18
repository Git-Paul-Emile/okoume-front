import { z } from 'zod';
import { backend, getAll } from '@/api/backend';
import type { Id } from '@/api/types';
import type { PrivacyRequest, PrivacyRequestStatus, PrivacyRequestType } from './privacy.types';

/**
 * Données personnelles sur l'API (api/src/features/privacy). L'anonymisation et les blocages (commande en cours,
 * retour, boutique) sont décidés par le serveur : le front affiche son refus motivé.
 */

const requestDto = z.object({
  id: z.string(),
  number: z.string(),
  customerId: z.string().nullable(),
  name: z.string(),
  email: z.string(),
  type: z.enum(['access', 'export', 'correction', 'deletion']),
  details: z.string(),
  status: z.enum(['received', 'in_progress', 'completed', 'refused']),
  response: z.string().nullable(),
  history: z.array(z.object({ at: z.string(), by: z.string(), event: z.string() })),
  dueAt: z.string(),
  createdAt: z.string(),
});

export function toPrivacyRequest(raw: unknown): PrivacyRequest {
  const r = requestDto.parse(raw);
  return {
    id: r.id,
    number: r.number,
    userId: r.customerId ?? '',
    name: r.name,
    email: r.email,
    type: r.type,
    details: r.details,
    status: r.status,
    createdAt: r.createdAt,
    dueAt: r.dueAt,
    ...(r.response !== null ? { response: r.response } : {}),
    history: r.history,
  };
}

/** Copie des données : téléchargée telle que l'API la prépare, seule sa date de génération est vérifiée. */
const exportDto = z.object({ generatedAt: z.string() }).catchall(z.unknown());

export const privacyBackend = {
  mine: (signal?: AbortSignal) => getAll('/me/privacy-requests', {}, toPrivacyRequest, signal),

  create: async (type: Extract<PrivacyRequestType, 'access' | 'correction'>, details: string) =>
    toPrivacyRequest(await backend.post('/me/privacy-requests', { type, details })),

  /** L'API garde la trace de l'export dans le suivi des demandes du client. */
  exportMine: async () => exportDto.parse(await backend.post('/me/data-exports')),

  deleteMine: async (password: string) => {
    await backend.post('/me/account-deletion', { password });
  },

  staffList: (signal?: AbortSignal) => getAll('/staff/privacy-requests', {}, toPrivacyRequest, signal),

  staffExport: async (id: Id) => exportDto.parse(await backend.post(`/staff/privacy-requests/${id}/exports`)),

  /** Clore une demande de suppression anonymise le compte côté serveur. */
  decide: async (id: Id, status: Exclude<PrivacyRequestStatus, 'received'>, response?: string) =>
    toPrivacyRequest(
      await backend.patch(`/staff/privacy-requests/${id}`, response === undefined ? { status } : { status, response }),
    ),
};
