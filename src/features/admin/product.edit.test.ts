import type { AdminProduct } from './admin.types';
import { computeBulkPrices, parseSpecs, priceDiffs, specsToText } from './product.edit';

const product = {
  id: 'p1',
  name: 'Robe',
  variants: [
    { id: 'm', label: 'M', price: 25000, cost: 15000 },
    { id: 'l', label: 'L', price: 25000, cost: 24000 },
  ],
} as AdminProduct;

describe('historique des prix', () => {
  it('ne retient que les variantes dont le prix change', () => {
    expect(priceDiffs(product, { m: 27000, l: 25000 }, 'Nouveau tarif fournisseur', 'Nadia')).toEqual([
      {
        productId: 'p1',
        variantId: 'm',
        label: 'Robe · M',
        before: 25000,
        after: 27000,
        by: 'Nadia',
        reason: 'Nouveau tarif fournisseur',
      },
    ]);
  });
});

describe('modification en masse', () => {
  it('applique un pourcentage arrondi à la centaine et signale un prix sous le coût', () => {
    const lines = computeBulkPrices([product], { mode: 'percent', value: -5, round: true });
    expect(lines.map((l) => l.after)).toEqual([23800, 23800]);
    expect(lines.map((l) => l.belowCost)).toEqual([false, true]);
  });

  it('applique un montant fixe sans descendre sous 100 FCFA', () => {
    expect(computeBulkPrices([product], { mode: 'fixed', value: -30000, round: false })[0].after).toBe(100);
  });
});

describe('caractéristiques', () => {
  it('lit « Libellé : valeur » ligne par ligne et revient au texte', () => {
    const specs = parseSpecs('Matière : coton wax\n\nGarantie: 12 mois\nLigne invalide');
    expect(specs).toEqual([
      { label: 'Matière', value: 'coton wax' },
      { label: 'Garantie', value: '12 mois' },
    ]);
    expect(parseSpecs(specsToText(specs))).toEqual(specs);
  });
});
