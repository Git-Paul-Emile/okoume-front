import { passwordError } from './adminSecurity';

describe('sécurité du back-office', () => {
  it('exige un mot de passe solide', () => {
    expect(passwordError('court1', 'court1')).toMatch(/12/);
    expect(passwordError('motdepasselong', 'motdepasselong')).toMatch(/chiffre/);
    expect(passwordError('motdepasse2026', 'autre')).toMatch(/différents/);
    expect(passwordError('motdepasse2026', 'motdepasse2026')).toBeNull();
  });
});
