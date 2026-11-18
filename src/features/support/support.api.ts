import { supportBackend } from './support.backend';
import type { Id } from '@/api/types';
import type { TicketInput } from './support.schemas';
import type { Attachment, Ticket } from './support.types';

export const supportApi = {
  mine: (userId: Id, signal?: AbortSignal): Promise<Ticket[]> => supportBackend.mine(userId, signal),
  /** Seule une demande du compte connecté se relit par son numéro. */
  byNumber: (number: string, userId: Id | null, signal?: AbortSignal) =>
    supportBackend.byNumber(number, userId, signal),
  /** La priorité est décidée par le serveur (un retour passe en priorité). */
  create: (input: TicketInput, userId: Id | null, attachments: Attachment[] = []) =>
    supportBackend.create(input, userId, attachments),
  /** Toute réponse du client remet la demande « à traiter » côté équipe. */
  reply: (ticket: Ticket, { body, attachments = [] }: { body: string; attachments?: Attachment[] }) =>
    supportBackend.reply(ticket, body, attachments),
  /** Réouverture d'une demande résolue ou clôturée, dans le délai prévu (15.3). */
  reopen: (ticket: Ticket, reason: string) => supportBackend.reopen(ticket, reason),
  rate: (ticket: Ticket, satisfaction: number) => supportBackend.rate(ticket, satisfaction),
};
