import { correctionError } from './loyalty.rules';

describe('points de fidélité', () => {
  it('exige un motif et un nombre entier pour une correction', () => {
    expect(correctionError(0, 'Geste commercial')).toMatch(/entier/);
    expect(correctionError(1.5, 'Geste commercial')).toMatch(/entier/);
    expect(correctionError(50, '')).toMatch(/motif/);
    expect(correctionError(-50, 'Erreur de saisie')).toBeNull();
  });
});
