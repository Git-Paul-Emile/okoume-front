import { formatPrice } from './formatPrice';

describe('formatPrice', () => {
  it('formate en FCFA avec séparateur de milliers', () => {
    expect(formatPrice(125000)).toBe('125\u00a0000\u00a0FCFA');
  });

  it('arrondit au franc', () => {
    expect(formatPrice(999.6)).toBe('1\u00a0000\u00a0FCFA');
  });
});
