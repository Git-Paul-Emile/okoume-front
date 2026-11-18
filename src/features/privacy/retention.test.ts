import { expired, lastActivity, RETENTION_RULES, visibleInAccount } from './retention';

const NOW = new Date('2026-11-03T12:00:00Z').getTime();

describe('durées de conservation', () => {
  it('fixe les six durées prévues', () => {
    expect(RETENTION_RULES.map((r) => r.duration)).toEqual([
      '3 ans',
      '10 ans',
      '30 jours',
      '13 mois',
      '12 mois',
      '3 ans',
    ]);
  });

  it('détecte les données échues', () => {
    expect(expired('abandonedCarts', '2026-10-01T00:00:00Z', NOW)).toBe(true);
    expect(expired('abandonedCarts', '2026-10-20T00:00:00Z', NOW)).toBe(false);
    expect(expired('browsing', '2025-09-01T00:00:00Z', NOW)).toBe(true);
    expect(expired('connectionLogs', '2026-01-01T00:00:00Z', NOW)).toBe(false);
    expect(expired('accounting', '2018-01-01T00:00:00Z', NOW)).toBe(false);
    expect(expired('accounting', null, NOW)).toBe(false);
  });

  it('sépare le compte client des archives comptables', () => {
    expect(visibleInAccount('2025-01-01T00:00:00Z', NOW)).toBe(true);
    expect(visibleInAccount('2022-01-01T00:00:00Z', NOW)).toBe(false);
  });

  it('retient la dernière activité du client', () => {
    expect(lastActivity({ createdAt: '2020-01-01', lastLoginAt: '2023-05-01' }, ['2024-02-01', '2021-01-01'])).toBe(
      '2024-02-01',
    );
    expect(expired('inactiveAccounts', lastActivity({ createdAt: '2020-01-01' }, ['2023-01-01']), NOW)).toBe(true);
  });
});
