import type { Product } from '@/features/products/products.types';
import { relevance } from './search.utils';

const product = {
  name: 'Écouteurs sans fil Beats Flex',
  brand: 'Beats',
  shortDescription: 'Embouts magnétiques',
  tags: [],
  sku: 'GA-1',
} as unknown as Product;

describe('relevance', () => {
  it('ignore les accents et la casse', () => {
    expect(relevance(product, 'ecouteurs')).toBeGreaterThan(0);
  });

  it('tolère une faute de frappe', () => {
    expect(relevance(product, 'ecouteur')).toBeGreaterThan(0);
    expect(relevance(product, 'magnetiqes')).toBeGreaterThan(0);
  });

  it('exclut un produit sans rapport', () => {
    expect(relevance(product, 'canapé')).toBe(0);
  });
});
