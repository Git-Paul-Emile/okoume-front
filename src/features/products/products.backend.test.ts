import { describe, expect, it } from 'vitest';
import { toProduct } from './products.backend';
import { availableStock, variantAvailability } from './products.utils';

const variant = (available: number, availability: 'in_stock' | 'low_stock' | 'out_of_stock') => ({
  id: `v-${available}`,
  sku: `SKU-${available}`,
  label: 'Taille M',
  attributes: { Taille: 'M' },
  price: 20_000,
  salePrice: 18_000,
  available,
  availability,
  image: null,
});

const dto = {
  id: '0c5a6f8e-1d2b-8c3d-9e4f-5a6b7c8d9e0f',
  slug: 'robe-wax',
  name: 'Robe wax',
  sku: 'GA-1',
  categoryId: 'cat',
  rootCategoryId: 'root',
  brand: null,
  shortDescription: 'Robe en pagne wax.',
  description: ['Robe cousue main.'],
  specs: [{ label: 'Matière', value: 'Coton' }],
  usageTips: null,
  tax: { vatRate: 18, hsCode: null },
  images: ['https://res.cloudinary.com/okoza/a.webp'],
  thumbnail: null,
  variants: [variant(12, 'in_stock'), variant(2, 'low_stock'), variant(0, 'out_of_stock')],
  promotion: { type: 'percent', value: 10, startsAt: '2026-11-01T00:00:00.000Z', endsAt: '2026-12-01T00:00:00.000Z' },
  dealOfTheDay: false,
  featured: true,
  isNew: false,
  tags: ['wax'],
  createdAt: '2026-10-01T00:00:00.000Z',
};

describe('produit de l’API dans le format du front', () => {
  it('garde la disponibilité publiée par l’API, sans stock exact ni réservation', () => {
    const product = toProduct(dto);
    expect(product.variants.map(availableStock)).toEqual([12, 2, 0]);
    expect(product.variants.map(variantAvailability)).toEqual(['in_stock', 'low_stock', 'out_of_stock']);
    expect(product.variants.every((v) => v.reserved === 0)).toBe(true);
  });

  it('complète ce que l’API ne publie pas encore : vignette, produits associés, statut', () => {
    expect(toProduct(dto)).toMatchObject({
      thumbnail: 'https://res.cloudinary.com/okoza/a.webp',
      relatedIds: [],
      status: 'published',
      tax: { vatRate: 18, hsCode: '' },
    });
  });

  it('refuse une réponse inattendue plutôt que d’afficher des données fausses', () => {
    expect(() => toProduct({ ...dto, variants: [{ ...variant(1, 'in_stock'), available: -1 }] })).toThrow();
    expect(() => toProduct({ id: 'incomplet' })).toThrow();
  });
});
