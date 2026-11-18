import { maskEmail, sessionExpired } from './loginGuard';

describe('code de vérification', () => {
  it('masque l’adresse e-mail', () => {
    expect(maskEmail('admin@boutique.ga')).toBe('a••••@boutique.ga');
  });
});

describe('expiration de session', () => {
  it('expire après 60 minutes sans activité', () => {
    const t0 = 1_000_000;
    expect(sessionExpired(t0, t0 + 59 * 60_000)).toBe(false);
    expect(sessionExpired(t0, t0 + 61 * 60_000)).toBe(true);
    expect(sessionExpired(null, t0)).toBe(false);
  });
});
