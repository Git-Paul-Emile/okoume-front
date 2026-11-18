import { budgetExhausted, budgetPeriod, checkRate, nextPeriodStart } from './assistantQuota';

describe('limites de l’assistant client', () => {
  const now = 10_000_000;
  it('limite les messages par heure et indique quand reprendre', () => {
    const recent = Array.from({ length: 3 }, (_, i) => now - (i + 1) * 60_000);
    expect(checkRate(recent, now, 5)).toEqual({ ok: true, remaining: 1, retryAt: null });
    const full = checkRate(recent, now, 3);
    expect(full.ok).toBe(false);
    expect(full.retryAt).toBe(now - 3 * 60_000 + 3_600_000);
    expect(checkRate([now - 2 * 3_600_000], now, 1).ok).toBe(true);
  });

  it('suspend les requêtes quand le budget du mois est atteint', () => {
    expect(budgetExhausted(500, 500)).toBe(true);
    expect(budgetExhausted(499, 500)).toBe(false);
    expect(budgetExhausted(10_000, undefined)).toBe(false);
    expect(budgetPeriod(new Date(2026, 10, 3))).toBe('2026-11');
    expect(nextPeriodStart(new Date(2026, 11, 20)).getMonth()).toBe(0);
  });
});
