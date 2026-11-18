import { LocateFixed, SearchX } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { Checkbox, SelectField, TextField } from '@/components/ui/TextField';
import { brand } from '@/config/brand';
import { useCategories } from '@/features/categories/categories.queries';
import { ListingCard, ListingCardSkeleton } from '@/features/marketplace/components/ListingCard';
import {
  CONDITIONS,
  conditionLabel,
  type ListingCondition,
  type ListingFilters,
  type Position,
} from '@/features/marketplace/marketplace.backend';
import { useListings } from '@/features/marketplace/marketplace.queries';
import { pluralize } from '@/utils/text';

const SORTS = [
  { value: '', label: 'Pertinence ou plus récentes' },
  { value: '-publishedAt', label: 'Plus récentes' },
  { value: 'price', label: 'Prix croissant' },
  { value: '-price', label: 'Prix décroissant' },
] as const;
const RADIUS = [5, 10, 25, 50] as const;

const toInt = (value: string | null) => {
  const n = Number(value);
  return value && Number.isInteger(n) && n >= 0 ? n : undefined;
};

/** Critères lus dans l'adresse : une recherche se partage par lien, sans la position de l'acheteur. */
function filtersFrom(params: URLSearchParams): ListingFilters {
  const condition = (params.get('etat') ?? '').split(',').flatMap((v) => CONDITIONS.filter((c) => c === v));
  const sort = SORTS.find((s) => s.value && s.value === params.get('tri'))?.value;
  const kind = params.get('type');
  return {
    search: params.get('q') ?? undefined,
    category: params.get('categorie') ?? undefined,
    kind: kind === 'product' || kind === 'service' ? kind : undefined,
    condition,
    city: params.get('ville') ?? undefined,
    minPrice: toInt(params.get('min')),
    maxPrice: toInt(params.get('max')),
    sort: sort || undefined,
    page: toInt(params.get('page')) || 1,
  };
}

/** Annonces des vendeurs de la place de marché (32.4) : recherche, filtres, et annonces autour de soi. */
export default function ListingsPage() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFrom(params), [params]);
  const [position, setPosition] = useState<Position | null>(null);
  const [maxKm, setMaxKm] = useState<number | null>(10);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');
  const [query, setQuery] = useState(filters.search ?? '');
  const { data: categories } = useCategories();
  // Grandes familles du catalogue, partagées avec les annonces ; les collections n'en font pas partie
  const roots = (categories?.tree ?? []).filter((c) => !c.members?.length);
  const near = position ? { position, maxKm } : null;
  const listings = useListings(position ? { ...filters, sort: filters.sort ?? 'distance' } : filters, near);

  useEffect(() => {
    document.title = `${brand.name} : annonces des vendeurs`;
  }, []);

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  const locate = () => {
    if (!('geolocation' in navigator)) return setLocateError('Votre navigateur ne donne pas sa position.');
    setLocating(true);
    setLocateError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ latitude: coords.latitude, longitude: coords.longitude });
        setLocating(false);
      },
      () => {
        setLocateError('Position refusée ou indisponible : la recherche continue sans elle.');
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };

  const toggleCondition = (c: ListingCondition, checked: boolean) => {
    const current = filters.condition ?? [];
    update({ etat: (checked ? [...current, c] : current.filter((x) => x !== c)).join(',') || null });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    update({ q: query.trim() || null });
  };

  const page = listings.data;
  const pageCount = page ? Math.max(1, Math.ceil(page.total / page.limit)) : 1;

  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: 'Annonces' }]} />
      <h1 className="mb-1 text-2xl sm:text-3xl">Annonces des vendeurs</h1>
      <p className="mb-6 max-w-2xl text-ink-soft">
        Produits et services proposés par des boutiques du Gabon. Vous contactez le vendeur par le tchat, puis vous
        convenez avec lui du paiement et de la remise.
      </p>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-5" aria-label="Filtres">
          <form onSubmit={submit} className="space-y-2">
            <TextField label="Rechercher" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Button type="submit" size="sm" variant="outline" className="w-full">
              Rechercher
            </Button>
          </form>

          <div className="card space-y-3 p-4">
            <p className="text-sm font-semibold">Autour de moi</p>
            {position ? (
              <>
                <SelectField
                  label="Distance"
                  value={maxKm ? String(maxKm) : ''}
                  onChange={(e) => setMaxKm(toInt(e.target.value) ?? null)}
                >
                  {RADIUS.map((km) => (
                    <option key={km} value={km}>
                      {km} km
                    </option>
                  ))}
                  <option value="">Partout, les plus proches d’abord</option>
                </SelectField>
                <Button size="sm" variant="ghost" onClick={() => setPosition(null)}>
                  Ne plus utiliser ma position
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                icon={<LocateFixed className="size-4" />}
                loading={locating}
                onClick={locate}
                className="w-full"
              >
                Utiliser ma position
              </Button>
            )}
            <p className="text-xs text-ink-muted">
              Votre position sert à cette recherche seulement : arrondie, elle n’est ni conservée ni montrée aux
              vendeurs.
            </p>
            {locateError && <p className="text-xs font-medium text-danger">{locateError}</p>}
          </div>

          <SelectField
            label="Catégorie"
            value={filters.category ?? ''}
            onChange={(e) => update({ categorie: e.target.value || null })}
          >
            <option value="">Toutes</option>
            {roots.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Type"
            value={filters.kind ?? ''}
            onChange={(e) => update({ type: e.target.value || null })}
          >
            <option value="">Produits et services</option>
            <option value="product">Produits</option>
            <option value="service">Services</option>
          </SelectField>
          <fieldset>
            <legend className="label">État</legend>
            <div className="space-y-1.5">
              {CONDITIONS.map((c) => (
                <Checkbox
                  key={c}
                  label={conditionLabel[c]}
                  checked={filters.condition?.includes(c) ?? false}
                  onChange={(e) => toggleCondition(c, e.target.checked)}
                />
              ))}
            </div>
          </fieldset>
          <TextField
            label="Ville"
            defaultValue={filters.city ?? ''}
            onBlur={(e) => update({ ville: e.target.value.trim() || null })}
          />
          <div className="grid grid-cols-2 gap-2">
            <TextField
              label="Prix min."
              inputMode="numeric"
              defaultValue={filters.minPrice ?? ''}
              onBlur={(e) => update({ min: e.target.value.trim() || null })}
            />
            <TextField
              label="Prix max."
              inputMode="numeric"
              defaultValue={filters.maxPrice ?? ''}
              onBlur={(e) => update({ max: e.target.value.trim() || null })}
            />
          </div>
        </aside>

        <section aria-label="Résultats">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-soft" aria-live="polite">
              {page ? pluralize(page.total, 'annonce', 'annonces') : 'Recherche…'}
            </p>
            <SelectField
              label="Trier"
              value={filters.sort ?? ''}
              onChange={(e) => update({ tri: e.target.value || null })}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {position && !s.value ? 'Les plus proches' : s.label}
                </option>
              ))}
            </SelectField>
          </div>

          {listings.isError ? (
            <ErrorState error={listings.error} onRetry={() => void listings.refetch()} />
          ) : !page ? (
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i}>
                  <ListingCardSkeleton />
                </li>
              ))}
            </ul>
          ) : page.items.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<SearchX className="size-7" />}
                title="Aucune annonce ne correspond"
                description="Élargissez la distance ou retirez un filtre."
              />
            </div>
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                {page.items.map((l) => (
                  <li key={l.slug}>
                    <ListingCard listing={l} />
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Pagination
                  page={filters.page}
                  pageCount={pageCount}
                  onChange={(p) => update({ page: p > 1 ? String(p) : null })}
                />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
