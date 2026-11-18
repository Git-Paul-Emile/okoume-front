import { maskTarget } from './verification';

describe('destination d’un code de vérification', () => {
  it('masque l’adresse e-mail et le numéro', () => {
    expect(maskTarget('awa@exemple.ga')).toBe('a••@exemple.ga');
    expect(maskTarget('+241 07 12 34 56')).toBe('•• •• 34 56');
  });
});
