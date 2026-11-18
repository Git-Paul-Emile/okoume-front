import { describe, expect, it } from 'vitest';
import type { Variant } from './products.types';
import { chooseVariant, findVariant, isColorAttribute, productOptions, swatchColor } from './variantOptions';

const variant = (id: string, attributes: Record<string, string>, stock = 5): Variant => ({
  id,
  sku: id,
  label: Object.values(attributes).join(' / '),
  attributes,
  price: 10_000,
  stock,
  reserved: 0,
  image: null,
  lowStockThreshold: 2,
});

const variants = [
  variant('s-rouge', { Taille: 'S', Couleur: 'Rouge' }),
  variant('s-bleu', { Taille: 'S', Couleur: 'Bleu' }, 0),
  variant('m-rouge', { Taille: 'M', Couleur: 'Rouge' }),
  variant('m-vert', { Taille: 'M', Couleur: 'Vert' }),
];

describe('options des variantes', () => {
  it('liste chaque option et ses valeurs dans l’ordre, avec leur disponibilité', () => {
    expect(productOptions(variants)).toEqual([
      {
        name: 'Taille',
        isColor: false,
        values: [
          { value: 'S', available: true },
          { value: 'M', available: true },
        ],
      },
      {
        name: 'Couleur',
        isColor: true,
        values: [
          { value: 'Rouge', available: true },
          { value: 'Bleu', available: false },
          { value: 'Vert', available: true },
        ],
      },
    ]);
  });

  it('reconnaît les couleurs et leur teinte, sans accent ni casse', () => {
    expect(isColorAttribute('Coloris')).toBe(true);
    expect(isColorAttribute('Taille')).toBe(false);
    expect(swatchColor('Bleu Marine')).toBe('#1f2f5c');
    expect(swatchColor('Crème')).toBe('#f3ead2');
    expect(swatchColor('Wax rouge et or')).toBeNull();
  });

  it('trouve la combinaison exacte, sinon la plus proche en gardant la valeur choisie', () => {
    expect(findVariant(variants, { Taille: 'M', Couleur: 'Vert' })?.id).toBe('m-vert');
    // M en Rouge existe : la couleur déjà choisie est gardée
    expect(chooseVariant(variants, { Taille: 'S', Couleur: 'Rouge' }, 'Taille', 'M')?.id).toBe('m-rouge');
    // S en Vert n'existe pas : la couleur Vert est gardée, la taille change
    expect(chooseVariant(variants, { Taille: 'S', Couleur: 'Rouge' }, 'Couleur', 'Vert')?.id).toBe('m-vert');
  });
});
