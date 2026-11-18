import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { Variant } from '../products.types';
import { productOptions } from '../variantOptions';
import { ProductCardOptions } from './ProductCardOptions';
import { VariantSelector } from './VariantSelector';

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

const colors = ['Blanc', 'Bleu ciel', 'Noir', 'Beige', 'Bordeaux'];
const variants = ['S', 'M'].flatMap((size) =>
  colors.map((color) =>
    variant(`${size}-${color}`, { Taille: size, Couleur: color }, size === 'S' && color === 'Blanc' ? 0 : 3),
  ),
);

describe('choix des variantes sur la fiche produit', () => {
  it('montre toutes les couleurs et choisit la combinaison taille et couleur', () => {
    const onSelect = vi.fn();
    render(<VariantSelector variants={variants} selectedId="S-Bleu ciel" onSelect={onSelect} />);
    expect(screen.getByText('Couleur :')).toBeInTheDocument();
    expect(screen.getAllByRole('radio', { name: /Blanc|Bleu ciel|Noir|Beige|Bordeaux/ })).toHaveLength(5);
    expect(screen.getByRole('radio', { name: 'Blanc (indisponible)' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'Bordeaux' }));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'S-Bordeaux' }));
    fireEvent.click(screen.getByRole('radio', { name: 'M' }));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'M-Bleu ciel' }));
  });
});

describe('options sur la carte produit', () => {
  it('montre la taille en menu, trois couleurs et renvoie à la fiche pour les autres', () => {
    const onChange = vi.fn();
    render(
      <MemoryRouter>
        <ProductCardOptions
          options={productOptions(variants)}
          selection={{ Taille: 'S', Couleur: 'Bleu ciel' }}
          productUrl="/produit/chemise"
          onChange={onChange}
        />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Taille')).toHaveValue('S');
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Voir les 2 autres couleurs sur la fiche produit' })).toHaveAttribute(
      'href',
      '/produit/chemise',
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Noir' }));
    expect(onChange).toHaveBeenCalledWith('Couleur', 'Noir');
    fireEvent.change(screen.getByLabelText('Taille'), { target: { value: 'M' } });
    expect(onChange).toHaveBeenCalledWith('Taille', 'M');
  });
});
