import type { TicketStatus } from './support.types';

export const ticketStatusLabel: Record<TicketStatus, string> = {
  open: 'Ouverte',
  pending: 'En attente de votre réponse',
  resolved: 'Résolue',
  closed: 'Clôturée',
};
