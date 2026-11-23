import type { CartLine } from './cart.types';
import { estimateTotals, vatIncluded } from './cart.utils';

const line = (over: Partial<CartLine>): CartLine => ({
  key: 'p:v',
  productId: 'p',
  variantId: 'v',
  slug: 'p',
  name: 'Produit',
  variantLabel: 'Standard',
  image: '',
  categoryId: 'smartphones',
  rootCategoryId: 'electronique',
  unitPrice: 10000,
  originalPrice: 10000,
  hasPromotion: false,
  quantity: 1,
  ...over,
});

describe('estimateTotals', () => {
  it('additionne produits et livraison, sans code ni points', () => {
    const t = estimateTotals([line({ unitPrice: 8000, originalPrice: 10000, quantity: 2 })], 2000);
    expect(t).toMatchObject({
      baseSubtotal: 20000,
      subtotal: 16000,
      productDiscount: 4000,
      total: 18000,
      itemCount: 2,
    });
    expect(t.codeDiscount).toBe(0);
  });

  it('compte une livraison inconnue comme gratuite', () => {
    expect(estimateTotals([line({})], null).total).toBe(10000);
  });
});

describe('TVA incluse', () => {
  it('détaille la TVA par taux, remises réparties, livraison comprise', () => {
    const lines = [
      line({ key: 'a', unitPrice: 11_800, vatRate: 18 }),
      line({ key: 'b', productId: 'q', unitPrice: 10_000, vatRate: 0 }),
    ];
    const t = { subtotal: 21_800, codeDiscount: 0, deliveryFee: 2_360, deliveryDiscount: 0 };
    expect(vatIncluded(lines, t, 18)).toEqual({ rows: [{ rate: 18, vat: 2_160 }], total: 2_160 });
    expect(vatIncluded(lines, t, null).total).toBe(1_800);
  });
});
