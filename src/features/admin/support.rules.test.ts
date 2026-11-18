import type { Ticket } from '@/features/support/support.types';
import { isLate, responseDue } from './support.rules';

const ticket = (over: Partial<Ticket> = {}): Ticket =>
  ({
    id: 't1',
    category: 'livraison',
    priority: 'normal',
    status: 'open',
    messages: [{ id: 'm1', from: 'customer', body: 'Bonjour', at: '2026-10-28T08:00:00.000Z' }],
    ...over,
  }) as Ticket;

describe('échéances de réponse', () => {
  it('part du dernier message du client, selon la priorité', () => {
    expect(responseDue(ticket())).toBe('2026-10-29T08:00:00.000Z');
    expect(responseDue(ticket({ priority: 'high' }), { high: 2, normal: 24 })).toBe('2026-10-28T10:00:00.000Z');
  });

  it('aucune échéance quand l’équipe a répondu en dernier ou que la demande est close', () => {
    const answered = ticket({
      messages: [...ticket().messages, { id: 'm2', from: 'support', body: 'Ok', at: '2026-10-28T09:00:00.000Z' }],
    });
    expect(responseDue(answered)).toBeNull();
    expect(responseDue(ticket({ status: 'resolved' }))).toBeNull();
  });

  it('signale le retard', () => {
    expect(isLate(ticket(), new Date('2026-10-29T09:00:00Z').getTime())).toBe(true);
    expect(isLate(ticket(), new Date('2026-10-28T20:00:00Z').getTime())).toBe(false);
  });
});
