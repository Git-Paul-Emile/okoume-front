import { closureError, isEscalated, type AlertRecord } from './alerts.rules';

const T0 = '2026-10-28T08:00:00.000Z';

const record = (over: Partial<AlertRecord> = {}): AlertRecord => ({
  id: 'a1',
  key: 'payments',
  level: 'critical',
  title: 'Paiements à vérifier',
  detail: '2 commandes',
  to: '/admin/paiements',
  state: 'new',
  occurrences: 1,
  firstSeenAt: T0,
  lastSeenAt: T0,
  cleared: false,
  episodes: [{ openedAt: T0 }],
  history: [],
  ...over,
});

describe('escalade et clôture', () => {
  it('escalade une alerte critique non prise en charge après le délai', () => {
    const now = new Date('2026-10-28T13:00:00Z').getTime();
    expect(isEscalated(record(), now, 4)).toBe(true);
    expect(isEscalated(record({ state: 'in_progress' }), now, 4)).toBe(false);
    expect(isEscalated(record({ level: 'warning' }), now, 4)).toBe(false);
  });

  it('exige une justification, et une action pour une alerte critique', () => {
    expect(closureError({ level: 'warning' }, '', '')).toMatch(/justification/);
    expect(closureError({ level: 'warning' }, 'Stock reçu', '')).toBeNull();
    expect(closureError({ level: 'critical' }, 'Réglé', '')).toMatch(/action/);
    expect(closureError({ level: 'critical' }, 'Réglé', 'Paiements vérifiés')).toBeNull();
  });
});
