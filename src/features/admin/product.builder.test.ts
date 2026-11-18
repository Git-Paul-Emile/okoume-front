import type { Category } from '@/features/categories/categories.types';
import { buildProduct, emptyProductForm, missingCost, validateProductForm, type ProductForm } from './product.builder';

const categories = [
  { id: 'mode', slug: 'mode', name: 'Mode', parentId: null, image: null },
  { id: 'mode-femme', slug: 'mode-femme', name: 'Femme', parentId: 'mode', image: null },
  { id: 'tradi-femme', slug: 'tradi-femme', name: 'Tenues', parentId: 'mode-femme', image: null },
] as Category[];

const form = (over: Partial<ProductForm> = {}): ProductForm => ({
  ...emptyProductForm(),
  name: 'Robe en pagne',
  categoryId: 'tradi-femme',
  shortDescription: 'Robe longue en pagne wax.',
  images: ['data:image/webp;base64,AAA'],
  optionName: 'Taille',
  variants: [
    { label: 'M', price: '25000', cost: '15000', stock: '4', threshold: '2' },
    { label: 'L', price: '25000', cost: '', stock: '0', threshold: '2' },
  ],
  ...over,
});

describe('validateProductForm', () => {
  it('accepte une saisie complète', () => {
    expect(validateProductForm(form())).toBeNull();
  });

  it('refuse un produit sans image ou sans catégorie', () => {
    expect(validateProductForm(form({ images: [] }))).toMatch(/image/);
    expect(validateProductForm(form({ categoryId: '' }))).toMatch(/catégorie/);
  });

  it('exige un nom d’option et des valeurs distinctes quand il y a plusieurs variantes', () => {
    expect(validateProductForm(form({ optionName: '' }))).toMatch(/distingue/);
    const twice = form().variants.map((v) => ({ ...v, label: 'M' }));
    expect(validateProductForm(form({ variants: twice }))).toMatch(/existe déjà/);
  });

  it('exige le coût d’achat pour publier, pas pour un brouillon', () => {
    expect(validateProductForm(form({ publish: true }))).toMatch(/obligatoire pour publier/);
    expect(validateProductForm(form({ publish: false }))).toBeNull();
    expect(missingCost({ variants: [{ cost: 0 }, { cost: 500 }] } as never)).toBe(true);
  });

  it('refuse un coût d’achat supérieur au prix', () => {
    const v = [{ label: '', price: '10000', cost: '12000', stock: '1', threshold: '1' }];
    expect(validateProductForm(form({ optionName: '', variants: v }))).toMatch(/coût/);
  });
});

describe('buildProduct', () => {
  const existing = [
    { id: '85', sku: 'GA-1084', slug: 'robe-en-pagne' },
    { id: '86', sku: 'GA-1085', slug: 'chemise' },
  ];

  it('attribue la référence suivante, une adresse unique et le rayon parent', () => {
    const p = buildProduct(form(), existing, categories, new Date('2026-10-29T10:00:00Z'));
    expect(p.id).toBe('87');
    expect(p.sku).toBe('GA-1086');
    expect(p.slug).toBe('robe-en-pagne-2');
    expect(p.rootCategoryId).toBe('mode');
    expect(p.thumbnail).toBe(p.images[0]);
    expect(p.status).toBe('draft');
  });

  it('prépare les variantes avec leurs attributs et sans réservation', () => {
    const [m, l] = buildProduct(form({ publish: true }), existing, categories).variants;
    expect(m).toMatchObject({ id: 'GA-1086-M', attributes: { Taille: 'M' }, price: 25000, cost: 15000, reserved: 0 });
    expect(l.cost).toBeUndefined();
  });

  it('un article unique devient la variante « Standard »', () => {
    const v = [{ label: '', price: '9000', cost: '', stock: '3', threshold: '1' }];
    const p = buildProduct(form({ optionName: '', variants: v }), existing, categories);
    expect(p.variants[0]).toMatchObject({ label: 'Standard', id: 'GA-1086-STANDARD', attributes: {} });
  });
});
