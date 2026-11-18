import { logEntry, maskSensitive } from './assistantLog';

describe('journal de l’assistant', () => {
  it('masque les coordonnées', () => {
    expect(maskSensitive('Awa, awa@exemple.ga, +241 07 12 34 56, 14 000 FCFA')).toBe(
      'Awa, [e-mail masqué], [téléphone masqué], 14 000 FCFA',
    );
    expect(maskSensitive('61 573 800 FCFA de stock')).toBe('61 573 800 FCFA de stock');
    expect(maskSensitive('appeler le 077123456')).toBe('appeler le [téléphone masqué]');
  });
  it('enregistre la question, la réponse et la source', () => {
    const e = logEntry(
      ' Marge ? ',
      { text: 'Marge : 10 %', bullets: ['a'], link: { to: '/admin/statistiques', label: 'x' } },
      'Nadia',
      'l1',
      'T',
    );
    expect(e).toEqual({
      id: 'l1',
      at: 'T',
      by: 'Nadia',
      question: 'Marge ?',
      answer: 'Marge : 10 % · a',
      source: '/admin/statistiques',
    });
  });
});
