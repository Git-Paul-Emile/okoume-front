import type { Ticket } from '@/features/support/support.types';

export const DEFAULT_SLA = { high: 4, normal: 24 };

/**
 * Échéance de réponse (15.3) : quand le dernier message vient du client, l'équipe doit répondre
 * dans le délai de la priorité. Si l'équipe a répondu en dernier, on attend le client : pas d'échéance.
 * Délai en heures calendaires : les jours ouvrés et horaires de support ne sont pas encore pris en compte.
 */
export function responseDue(ticket: Ticket, sla = DEFAULT_SLA): string | null {
  if (ticket.status === 'resolved' || ticket.status === 'closed') return null;
  const last = ticket.messages.at(-1);
  if (!last || last.from !== 'customer') return null;
  const hours = ticket.priority === 'high' ? sla.high : sla.normal;
  return new Date(new Date(last.at).getTime() + hours * 3_600_000).toISOString();
}

export const isLate = (ticket: Ticket, now: number, sla = DEFAULT_SLA) => {
  const due = responseDue(ticket, sla);
  return !!due && new Date(due).getTime() < now;
};
