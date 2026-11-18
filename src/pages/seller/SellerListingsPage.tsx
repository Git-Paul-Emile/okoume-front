import { Plus } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { SelectField } from '@/components/ui/TextField';
import { LISTING_STATUSES, listingStatusLabel, type SellerListingStatus } from '@/features/seller/seller.backend';
import { useSellerListings } from '@/features/seller/seller.queries';
import { formatPrice } from '@/utils/formatPrice';

const tone = (status: SellerListingStatus) =>
  status === 'published'
    ? 'forest'
    : status === 'changes_requested' || status === 'rejected'
      ? 'danger'
      : status === 'in_review' || status === 'pending_moderation'
        ? 'warning'
        : 'neutral';

/** Annonces de la boutique, filtrables par état (32.3). */
export default function SellerListingsPage() {
  const [params, setParams] = useSearchParams();
  const status = LISTING_STATUSES.find((s) => s === params.get('etat'));
  const page = Number(params.get('page')) || 1;
  const { data, isLoading, error, refetch } = useSellerListings(status, page);

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
        <SelectField label="État" value={status ?? ''} onChange={(e) => set('etat', e.target.value || null)}>
          <option value="">Toutes les annonces</option>
          {LISTING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {listingStatusLabel[s]}
            </option>
          ))}
        </SelectField>
        <ButtonLink to="/vendeur/annonces/nouvelle" icon={<Plus className="size-4" />}>
          Nouvelle annonce
        </ButtonLink>
      </div>
      {isLoading ? (
        <PageLoader />
      ) : error || !data ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <p className="card p-6 text-ink-soft">Aucune annonce {status ? 'dans cet état' : 'pour le moment'}.</p>
      ) : (
        <ul className="card divide-y divide-sage">
          {data.items.map((l) => (
            <li key={l.id}>
              <Link to={`/vendeur/annonces/${l.id}`} className="flex items-center gap-3 p-3 hover:bg-ivory">
                {l.photos[0] ? (
                  <img src={l.photos[0]} alt="" className="size-14 shrink-0 rounded-md object-cover" />
                ) : (
                  <span className="size-14 shrink-0 rounded-md bg-sage/50" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{l.title}</span>
                  <span className="text-sm text-ink-soft">{formatPrice(l.price)}</span>
                </span>
                <Badge tone={tone(l.status)}>{listingStatusLabel[l.status]}</Badge>
              </Link>
            </li>
          ))}
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
