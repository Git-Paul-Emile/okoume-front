import {
  activeParams,
  DEFAULT_PARAMS,
  decisionError,
  nextVersion,
  paramsError,
  proposalStatus,
} from './assistantRules';

const NOW = new Date('2026-11-03T12:00:00Z').getTime();
const d = (decision: 'accepted' | 'refused' | 'postponed' | 'executed', at: string, extra = {}) => ({
  id: at,
  proposalId: 'p1',
  decision,
  by: 'Nadia',
  at,
  ...extra,
});

describe('décisions sur les propositions', () => {
  it('suit la dernière décision', () => {
    expect(proposalStatus('p1', [], NOW)).toBe('new');
    expect(proposalStatus('p1', [d('accepted', '2026-11-03T10:00:00Z')], NOW)).toBe('accepted');
    expect(proposalStatus('p1', [d('accepted', '2026-11-01T10:00:00Z')], NOW)).toBe('stale');
    expect(
      proposalStatus('p1', [d('accepted', '2026-11-01T10:00:00Z'), d('executed', '2026-11-03T11:00:00Z')], NOW),
    ).toBe('executed');
  });

  it('un report revient à sa date, un refus exige un motif', () => {
    expect(proposalStatus('p1', [d('postponed', '2026-11-02T10:00:00Z', { until: '2026-11-10T00:00:00Z' })], NOW)).toBe(
      'postponed',
    );
    expect(proposalStatus('p1', [d('postponed', '2026-10-02T10:00:00Z', { until: '2026-10-10T00:00:00Z' })], NOW)).toBe(
      'new',
    );
    expect(decisionError('refused', '', undefined, NOW)).toMatch(/motif/);
    expect(decisionError('postponed', '', '2026-11-01T00:00:00Z', NOW)).toMatch(/future/);
    expect(proposalStatus('p1', [d('refused', '2026-11-02T10:00:00Z', { reason: 'Stock réservé' })], NOW)).toBe(
      'refused',
    );
  });
});

describe('versions des règles', () => {
  it('chaque changement, y compris une restauration, crée une version', () => {
    expect(activeParams([])).toEqual(DEFAULT_PARAMS);
    const v1 = nextVersion([], { ...DEFAULT_PARAMS, slowDiscount: 15 }, 'Test', 'Nadia', 'v1');
    const v2 = nextVersion([v1], DEFAULT_PARAMS, 'Restauration de la version 0', 'Nadia', 'v2');
    expect([v1.version, v2.version]).toEqual([1, 2]);
    expect(activeParams([v1, v2])).toEqual(DEFAULT_PARAMS);
    expect(paramsError({ ...DEFAULT_PARAMS, slowDiscount: 80 })).toMatch(/Remise/);
  });
});
