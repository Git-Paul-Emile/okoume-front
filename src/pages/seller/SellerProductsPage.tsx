import { Plus } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { SelectField } from '@/components/ui/TextField';
import { useSellerProducts } from '@/features/seller/seller.queries';
import { MODERATIONS, moderationLabel, sellerProductState } from '@/features/seller/sellerProducts.backend';
import { formatPrice } from '@/utils/formatPrice';

/** Produits de la boutique, filtrables par état de vérification (cahier des charges 32.3, 32.8). */
export default function SellerProductsPage() {
  const [params, setParams] = useSearchParams();
  const moderation = MODERATIONS.find((s) => s === params.get('etat'));
  const page = Number(params.get('page')) || 1;
  const { data, isLoading, error, refetch } = useSellerProducts(moderation, page);

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <SelectField
          label="Vérification"
          value={moderation ?? ''}
          onChange={(e) => set('etat', e.target.value || null)}
        >
          <option value="">Tous les produits</option>
          {MODERATIONS.map((s) => (
            <option key={s} value={s}>
              {moderationLabel[s]}
            </option>
          ))}
        </SelectField>
        <ButtonLink to="/vendeur/produits/nouveau" icon={<Plus className="size-4" />}>
          Nouveau produit
        </ButtonLink>
      </div>
      {isLoading ? (
        <PageLoader />
      ) : error || !data ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <p className="card p-6 text-ink-soft">
          Aucun produit {moderation ? 'dans cet état' : 'pour le moment'}. Vos produits validés sont publiés sur Okoumé,
          avec le nom de votre boutique.
        </p>
      ) : (
        <ul className="card divide-y divide-sage">
          {data.items.map((p) => {
            const state = sellerProductState(p);
            const prices = p.variants.map((v) => v.price);
            const stock = p.variants.reduce((sum, v) => sum + v.available, 0);
            return (
              <li key={p.id}>
                <Link to={`/vendeur/produits/${p.id}`} className="flex items-center gap-3 p-3 hover:bg-ivory">
                  {p.thumbnail ? (
                    <img src={p.thumbnail} alt="" className="size-14 shrink-0 rounded-md object-cover" />
                  ) : (
                    <span className="size-14 shrink-0 rounded-md bg-sage/50" aria-hidden="true" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.name}</span>
                    <span className="text-sm text-ink-soft">
                      {prices.length > 1 ? 'dès ' : ''}
                      {formatPrice(Math.min(...prices))} · {stock} disponible{stock > 1 ? 's' : ''}
                    </span>
                  </span>
                  <Badge tone={state.tone}>{state.label}</Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {data && (
        <div className="mt-6">
          <Pagination
            page={page}
            pageCount={Math.max(1, Math.ceil(data.total / data.limit))}
            onChange={(p) => set('page', p > 1 ? String(p) : null)}
          />
        </div>
      )}
    </div>
  );
}
