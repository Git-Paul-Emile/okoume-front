import { z } from 'zod';
import { ApiError } from '@/api/ApiError';
import { backend, getAll } from '@/api/backend';
import { signedUploadDto, uploadPhoto } from '@/api/mediaUpload';
import type { Id } from '@/api/types';
import type { ImageUploader } from '@/utils/upload';
import type { TicketInput } from './support.schemas';
import type { Attachment, Ticket, TicketStatus } from './support.types';

/**
 * Assistance sur l'API (api/src/features/support). Les pièces jointes sont des images envoyées chez l'hébergeur
 * avec une autorisation de l'API, réservée aux comptes : le formulaire de contact sans compte n'en a pas.
 */

const status = z.enum(['open', 'pending', 'resolved', 'closed']);

const ticketDto = z.object({
  id: z.string(),
  number: z.string(),
  email: z.string(),
  name: z.string(),
  category: z.enum(['commande', 'livraison', 'retour', 'produit', 'compte', 'publicite']),
  orderNumber: z.string().nullable(),
  subject: z.string(),
  status,
  priority: z.enum(['normal', 'high']),
  satisfaction: z.number().nullable(),
  closureReason: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  reopenedAt: z.string().nullable(),
  messages: z.array(
    z.object({
      id: z.string(),
      from: z.enum(['customer', 'support']),
      body: z.string(),
      attachments: z.array(z.string()),
      at: z.string(),
      staffName: z.string().nullable().optional(),
    }),
  ),
  createdAt: z.string(),
  customerId: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
});

/** Images jointes : l'API ne garde que leur adresse, le nom affiché est leur rang dans le message. */
const toAttachments = (urls: string[]): Attachment[] =>
  urls.map((url, i) => ({ name: `Image ${i + 1}`, type: 'image/webp', url }));

/** Demande de l'API dans la forme du front ; `ownerId` : le compte qui la lit sur ses propres routes. */
export function toTicket(raw: unknown, ownerId: Id | null): Ticket {
  const t = ticketDto.parse(raw);
  return {
    id: t.id,
    number: t.number,
    userId: t.customerId !== undefined ? t.customerId : ownerId,
    email: t.email,
    name: t.name,
    category: t.category,
    orderNumber: t.orderNumber,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    satisfaction: t.satisfaction,
    messages: t.messages.map((m) => ({
      id: m.id,
      from: m.from,
      body: m.body,
      at: m.at,
      ...(m.attachments.length ? { attachments: toAttachments(m.attachments) } : {}),
    })),
    createdAt: t.createdAt,
    ...(t.reopenedAt ? { reopenedAt: t.reopenedAt } : {}),
    ...(t.assigneeId !== undefined ? { assigneeId: t.assigneeId } : {}),
    ...(t.closureReason ? { closureReason: t.closureReason } : {}),
    ...(t.resolvedAt ? { resolvedAt: t.resolvedAt } : {}),
  };
}

const urlsOf = (attachments: Attachment[]) => attachments.map((a) => a.url);

export const supportBackend = {
  mine: (userId: Id, signal?: AbortSignal) => getAll('/support/tickets', {}, (raw) => toTicket(raw, userId), signal),

  async byNumber(number: string, userId: Id | null, signal?: AbortSignal): Promise<Ticket | null> {
    if (!userId) return null;
    try {
      return toTicket(await backend.get(`/support/tickets/${encodeURIComponent(number)}`, undefined, signal), userId);
    } catch (error) {
      if (error instanceof ApiError && (error.isNotFound || error.status === 400)) return null;
      throw error;
    }
  },

  create: async (input: TicketInput, userId: Id | null, attachments: Attachment[]) =>
    toTicket(
      await backend.post('/support/tickets', {
        name: input.name,
        email: input.email,
        category: input.category,
        orderNumber: input.orderNumber,
        subject: input.subject,
        message: input.message,
        attachments: urlsOf(attachments),
      }),
      userId,
    ),

  reply: async (ticket: Ticket, body: string, attachments: Attachment[]) =>
    toTicket(
      await backend.post(`/support/tickets/${ticket.number}/messages`, { body, attachments: urlsOf(attachments) }),
      ticket.userId,
    ),

  reopen: async (ticket: Ticket, reason: string) =>
    toTicket(await backend.post(`/support/tickets/${ticket.number}/reopenings`, { reason }), ticket.userId),

  rate: async (ticket: Ticket, score: number) =>
    toTicket(await backend.put(`/support/tickets/${ticket.number}/satisfaction`, { score }), ticket.userId),

  /** File de l'équipe : demandes urgentes d'abord, puis les plus anciennes. */
  staffList: (signal?: AbortSignal) => getAll('/staff/support/tickets', {}, (raw) => toTicket(raw, null), signal),

  answer: async (ticket: Ticket, body: string) =>
    toTicket(await backend.post(`/staff/support/tickets/${ticket.id}/messages`, { body }), null),

  update: async (
    ticket: Ticket,
    patch: { status?: TicketStatus; assigneeId?: string | null; closureReason?: string; priority?: 'normal' | 'high' },
  ) => toTicket(await backend.patch(`/staff/support/tickets/${ticket.id}`, patch), null),
};

/** Envoi d'une image jointe par un client connecté. */
export const supportImageUploader: ImageUploader = async (image) =>
  uploadPhoto(signedUploadDto.parse(await backend.post('/support/attachment-uploads')), image);
