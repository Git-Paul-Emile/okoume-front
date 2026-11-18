import { useId } from 'react';
import { Link } from 'react-router';
import type { OptionSelection, ProductOption } from '../variantOptions';
import { ColorSwatch } from './ColorSwatch';

/** Au-delà de trois couleurs, la suite est sur la fiche produit. */
export const MAX_CARD_COLORS = 3;

interface Props {
  options: ProductOption[];
  selection: OptionSelection;
  productUrl: string;
  onChange: (name: string, value: string) => void;
}

/**
 * Options visibles sur la carte produit : un menu par option (taille, pointure…) et les couleurs en pastilles.
 * Au-dessus du lien qui couvre la carte (z-10), pour rester cliquables.
 */
export function ProductCardOptions({ options, selection, productUrl, onChange }: Props) {
  const baseId = useId();
  if (!options.length) return null;
  return (
    <div className="relative z-10 flex flex-wrap items-end gap-x-4 gap-y-2 pt-1">
      {options.map((option, index) => {
        const id = `${baseId}-${index}`;
        if (!option.isColor)
          return (
            <div key={option.name} className="flex flex-col gap-1">
              <label htmlFor={id} className="text-xs text-ink-muted">
                {option.name}
              </label>
              <select
                id={id}
                value={selection[option.name] ?? ''}
                onChange={(e) => onChange(option.name, e.target.value)}
                className="h-8 min-w-14 rounded-md border border-sage-dark bg-white px-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-forest"
              >
                {option.values.map(({ value, available }) => (
                  <option key={value} value={value}>
                    {available ? value : `${value} (épuisé)`}
                  </option>
                ))}
              </select>
            </div>
          );
        const shown = option.values.slice(0, MAX_CARD_COLORS);
        const hidden = option.values.length - shown.length;
        return (
          <div key={option.name} className="flex flex-col gap-1">
            <span id={id} className="text-xs text-ink-muted">
              {option.name}
            </span>
            <div role="radiogroup" aria-labelledby={id} className="flex h-8 items-center gap-2">
              {shown.map(({ value, available }) => (
                <ColorSwatch
                  key={value}
                  value={value}
                  available={available}
                  selected={selection[option.name] === value}
                  onSelect={() => onChange(option.name, value)}
                />
              ))}
              {hidden > 0 && (
                <Link
                  to={productUrl}
                  className="text-xs font-semibold text-forest hover:underline"
                  aria-label={`Voir les ${hidden} autres couleurs sur la fiche produit`}
                >
                  +{hidden}
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
