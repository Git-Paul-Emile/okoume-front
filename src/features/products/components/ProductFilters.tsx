import { useState, type ReactNode } from 'react';
import { Checkbox } from '@/components/ui/TextField';
import { useCategories } from '@/features/categories/categories.queries';
import { ancestors } from '@/features/categories/categories.utils';
import { cn } from '@/utils/text';
import type { CatalogFilters } from '../products.types';

interface Props {
  filters: CatalogFilters;
  update: (patch: Partial<CatalogFilters>) => void;
  reset: () => void;
  facets: Array<{ name: string; values: string[] }>;
  priceMax: number;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-b border-sage py-5 first:pt-0 last:border-0">
      <legend className="mb-3 text-sm font-bold">{title}</legend>
      {children}
    </fieldset>
  );
}

/** Champs de prix : réinitialisés (via `key`) quand les filtres de l'URL changent. */
function PriceFilter({
  minPrice,
  maxPrice,
  priceMax,
  onApply,
}: {
  minPrice: number | null;
  maxPrice: number | null;
  priceMax: number;
  onApply: (min: number | null, max: number | null) => void;
}) {
  const [min, setMin] = useState(minPrice?.toString() ?? '');
  const [max, setMax] = useState(maxPrice?.toString() ?? '');
  const applyPrice = () => onApply(min ? Number(min) : null, max ? Number(max) : null);
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        applyPrice();
      }}
    >
      <label className="flex-1 text-xs text-ink-muted">
        Min
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={1000}
          value={min}
          onChange={(e) => setMin(e.target.value)}
          placeholder="0"
          className="input mt-1 px-2.5 py-2 text-sm"
        />
      </label>
      <label className="flex-1 text-xs text-ink-muted">
        Max
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={1000}
          value={max}
          onChange={(e) => setMax(e.target.value)}
          placeholder={String(priceMax || '')}
          className="input mt-1 px-2.5 py-2 text-sm"
        />
      </label>
      <button
        type="submit"
        className="h-[38px] rounded-md bg-forest px-3 text-sm font-semibold text-white hover:bg-forest-dark"
      >
        OK
      </button>
    </form>
  );
}

export function ProductFilters({ filters, update, reset, facets, priceMax }: Props) {
  const { data } = useCategories();
  // Racine et sous-catégorie actives, même quand le filtre porte sur un 3e niveau (ex. tenues traditionnelles)
  const activeChain = filters.category && data ? ancestors(filters.category, data.byId).map((c) => c.id) : [];
  const activeRoot = data?.tree.find((c) => activeChain.includes(c.id));

  return (
    <div>
      <Group title="Catégories">
        <ul className="space-y-0.5 text-sm">
          <li>
            <button
              type="button"
              onClick={() => update({ category: null })}
              className={cn(
                'w-full rounded-md px-2 py-1.5 text-left hover:bg-ivory',
                !filters.category && 'font-bold text-forest',
              )}
            >
              Toutes les catégories
            </button>
          </li>
          {data?.tree.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => update({ category: c.id, attributes: {} })}
                className={cn(
                  'w-full rounded-md px-2 py-1.5 text-left hover:bg-ivory',
                  filters.category === c.id && 'font-bold text-forest',
                )}
              >
                {c.name}
              </button>
              {activeRoot?.id === c.id && (
                <ul className="ml-3 border-l border-sage pl-2">
                  {c.children.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => update({ category: s.id })}
                        className={cn(
                          'w-full rounded-md px-2 py-1 text-left text-ink-soft hover:bg-ivory',
                          filters.category === s.id && 'font-bold text-forest',
                        )}
                      >
                        {s.name}
                      </button>
                      {activeChain.includes(s.id) && s.children.length > 0 && (
                        <ul className="ml-3 border-l border-sage pl-2">
                          {s.children.map((g) => (
                            <li key={g.id}>
                              <button
                                type="button"
                                onClick={() => update({ category: g.id })}
                                className={cn(
                                  'w-full rounded-md px-2 py-1 text-left text-ink-soft hover:bg-ivory',
                                  filters.category === g.id && 'font-bold text-forest',
                                )}
                              >
                                {g.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </Group>

      <Group title="Prix (FCFA)">
        <PriceFilter
          key={`${filters.minPrice}-${filters.maxPrice}`}
          minPrice={filters.minPrice}
          maxPrice={filters.maxPrice}
          priceMax={priceMax}
          onApply={(minPrice, maxPrice) => update({ minPrice, maxPrice })}
        />
      </Group>

      <Group title="Disponibilité et offres">
        <div className="space-y-3">
          <Checkbox
            label="En stock uniquement"
            checked={filters.inStock}
            onChange={(e) => update({ inStock: e.target.checked })}
          />
          <Checkbox
            label="En promotion"
            checked={filters.onSale}
            onChange={(e) => update({ onSale: e.target.checked })}
          />
        </div>
      </Group>

      {facets.map((f) => (
        <Group key={f.name} title={f.name}>
          <div className="flex flex-wrap gap-2">
            {f.values.map((v) => {
              const selected = filters.attributes[f.name]?.includes(v) ?? false;
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    const cur = filters.attributes[f.name] ?? [];
                    update({
                      attributes: {
                        ...filters.attributes,
                        [f.name]: selected ? cur.filter((x) => x !== v) : [...cur, v],
                      },
                    });
                  }}
                  className={cn(
                    'min-w-11 rounded-md border px-2.5 py-1.5 text-sm font-medium transition',
                    selected ? 'border-forest bg-forest text-white' : 'border-sage-dark bg-white hover:border-forest',
                  )}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </Group>
      ))}

      <button type="button" onClick={reset} className="mt-2 text-sm font-semibold text-mure hover:underline">
        Réinitialiser les filtres
      </button>
    </div>
  );
}
