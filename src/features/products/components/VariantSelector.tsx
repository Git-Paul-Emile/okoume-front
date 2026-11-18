import { motion } from 'motion/react';
import { cn } from '@/utils/text';
import type { Variant } from '../products.types';
import { availableStock } from '../products.utils';
import { chooseVariant, productOptions } from '../variantOptions';
import { ColorSwatch } from './ColorSwatch';

interface Props {
  variants: Variant[];
  selectedId: string;
  onSelect: (variant: Variant) => void;
}

/**
 * Choix de la variante sur la fiche produit : un groupe par option (taille, couleur…), toutes les couleurs en
 * pastilles. Une valeur est barrée quand sa combinaison avec les autres choix est épuisée ; la choisir mène à la
 * combinaison la plus proche.
 */
export function VariantSelector({ variants, selectedId, onSelect }: Props) {
  if (variants.length <= 1) return null;
  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];
  const selection = { ...selected.attributes };
  const options = productOptions(variants);

  // Produit sans attribut (variantes nommées seulement) : un bouton par variante, comme auparavant
  if (!options.length)
    return (
      <fieldset>
        <legend className="mb-2.5 text-sm">
          <span className="font-bold">Option :</span> <span className="text-ink-soft">{selected.label}</span>
        </legend>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {variants.map((v) => (
            <OptionButton
              key={v.id}
              group="label"
              label={v.label}
              active={v.id === selected.id}
              out={availableStock(v) === 0}
              onClick={() => onSelect(v)}
            />
          ))}
        </div>
      </fieldset>
    );

  const inStockWith = (name: string, value: string) =>
    variants.some(
      (v) =>
        v.attributes[name] === value &&
        availableStock(v) > 0 &&
        Object.entries(selection).every(([n, val]) => n === name || v.attributes[n] === val),
    );

  const choose = (name: string, value: string) => {
    const next = chooseVariant(variants, selection, name, value);
    if (next) onSelect(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {options.map((option) => (
        <fieldset key={option.name}>
          <legend className="mb-2.5 text-sm">
            <span className="font-bold">{option.name} :</span>{' '}
            <span className="text-ink-soft">{selection[option.name]}</span>
          </legend>
          <div className={cn('flex flex-wrap', option.isColor ? 'gap-3' : 'gap-2')} role="radiogroup">
            {option.values.map(({ value }) =>
              option.isColor ? (
                <ColorSwatch
                  key={value}
                  value={value}
                  size="md"
                  selected={selection[option.name] === value}
                  available={inStockWith(option.name, value)}
                  onSelect={() => choose(option.name, value)}
                />
              ) : (
                <OptionButton
                  key={value}
                  group={option.name}
                  label={value}
                  active={selection[option.name] === value}
                  out={!inStockWith(option.name, value)}
                  onClick={() => choose(option.name, value)}
                />
              ),
            )}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function OptionButton({
  group,
  label,
  active,
  out,
  onClick,
}: {
  group: string;
  label: string;
  active: boolean;
  out: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        'relative min-w-14 rounded-md border px-3.5 py-2 text-sm font-semibold transition-colors',
        active ? 'border-forest text-forest' : 'border-sage-dark bg-white text-ink hover:border-forest',
        out && 'text-ink-muted line-through decoration-1',
      )}
      title={out ? 'Indisponible' : undefined}
    >
      {active && (
        <motion.span
          layoutId={`variant-active-${group}`}
          className="absolute inset-0 rounded-md bg-forest-50 ring-2 ring-forest"
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}
      <span className="relative">{label}</span>
      {out && <span className="sr-only"> (indisponible)</span>}
    </button>
  );
}
