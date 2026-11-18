import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { SelectField } from '@/components/ui/TextField';
import { conditionLabel, reportLabel } from '@/features/marketplace/marketplace.backend';
import { LISTING_STATUSES, listingStatusLabel, type SellerListingStatus } from '@/features/seller/seller.backend';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { formatDateTime } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';
import { useAdminMutation } from '../admin.queries';
import {
  adminMarketplaceBackend,
  type ListingDecision,
  type ListingReport,
  type StaffListing,
} from '../adminMarketplace.backend';
import { ReasonDialog } from '../components/ReasonDialog';
import { can } from '../permissions';

const pageCount = (data: { total: number; limit: number } | undefined) =>
  data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

const outcomeLabel = {
  approved: 'conforme',
  changes_requested: 'corrections demandées',
  moderation: 'à examiner par une personne',
  rejected: 'refusée',
} as const;

/** Une annonce à examiner : contenu, avis reçus (vérification automatique et équipe), décisions. */
function ListingCard({ listing, canDecide }: { listing: StaffListing; canDecide: boolean }) {
  const [asking, setAsking] = useState<'request_changes' | 'reject' | 'hide' | null>(null);
  const decide = useAdminMutation(
    (d: ListingDecision) => adminMarketplaceBackend.decideListing(listing.id, d),
    (d) =>
      d.decision === 'approve'
        ? `Annonce « ${listing.title} » publiée`
        : d.decision === 'hide'
          ? `Annonce « ${listing.title} » masquée`
          : d.decision === 'reject'
            ? `Annonce « ${listing.title} » refusée`
            : `Corrections demandées pour « ${listing.title} »`,
  );
  const last = listing.reviews.at(-1);
  const titles = {
    request_changes: 'Demander des corrections',
    reject: 'Refuser définitivement',
    hide: 'Masquer l’annonce',
  };

  return (
    <li className="card space-y-3 p-5 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{listing.title}</p>
          <p className="text-ink-muted">
            {listing.shop.name}
            {listing.shop.status === 'suspended' && ', boutique suspendue'}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge>{listingStatusLabel[listing.status]}</Badge>
          {listing.openReports > 0 && <Badge tone="danger">{listing.openReports} signalement(s)</Badge>}
        </div>
      </div>
      {listing.photos.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {listing.photos.map((src) => (
            <li key={src}>
              <a href={src} target="_blank" rel="noopener noreferrer">
                <img src={src} alt="" className="size-20 rounded-md border border-sage object-cover" />
              </a>
            </li>
          ))}
        </ul>
      )}
      <p>
        <strong>{formatPrice(listing.price)}</strong>, {listing.category.label},{' '}
        {listing.kind === 'service' ? 'service' : listing.condition ? conditionLabel[listing.condition] : 'produit'},{' '}
        {[listing.district, listing.city].filter(Boolean).join(', ')}
      </p>
      <p className="whitespace-pre-line text-ink-soft">{listing.description}</p>
      {last && (
        <div className="rounded-md bg-ivory p-3">
          <p className="font-semibold">
            Dernier avis ({last.source === 'ai' ? 'vérification automatique' : 'équipe'}) : {outcomeLabel[last.outcome]}
          </p>
          {last.issues.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {last.issues.map((issue, i) => (
                <li key={i}>{issue.message}</li>
              ))}
            </ul>
          )}
          {last.reason && <p className="mt-1 text-ink-soft">{last.reason}</p>}
        </div>
      )}
      {canDecide && (
        <div className="flex flex-wrap gap-2">
          {listing.status !== 'published' && (
            <Button size="sm" loading={decide.isPending} onClick={() => decide.mutate({ decision: 'approve' })}>
              Publier
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setAsking('request_changes')}>
            Demander des corrections
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAsking('reject')}>
            Refuser
          </Button>
          {listing.status === 'published' && (
            <Button size="sm" variant="danger" onClick={() => setAsking('hide')}>
              Masquer
            </Button>
          )}
          <Link
            to={`/annonces/${listing.slug}`}
            className="self-center text-sm font-semibold text-forest hover:underline"
          >
            Voir la fiche publique
          </Link>
        </div>
      )}
      <ReasonDialog
        open={!!asking}
        onClose={() => setAsking(null)}
        title={asking ? titles[asking] : ''}
        description="Le motif est communiqué au vendeur."
        confirmLabel="Confirmer"
        danger={asking === 'reject' || asking === 'hide'}
        loading={decide.isPending}
        onConfirm={(reason) =>
          asking && decide.mutate({ decision: asking, reason }, { onSuccess: () => setAsking(null) })
        }
      />
    </li>
  );
}

/** Annonces par état ; par défaut celles qui attendent une décision humaine. */
export function ListingsModerationTab() {
  const admin = useAdminAuthStore((s) => s.admin);
  const [status, setStatus] = useState<SellerListingStatus>('pending_moderation');
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['admin', 'marketplace', 'listings', status, page],
    queryFn: ({ signal }) => adminMarketplaceBackend.listings(status, page, signal),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-4">
      <SelectField
        label="État"
        value={status}
        onChange={(e) => {
          setStatus(LISTING_STATUSES.find((s) => s === e.target.value) ?? 'pending_moderation');
          setPage(1);
        }}
      >
        {LISTING_STATUSES.map((s) => (
          <option key={s} value={s}>
            {listingStatusLabel[s]}
          </option>
        ))}
      </SelectField>
      {query.isLoading ? (
        <PageLoader />
      ) : query.isError || !query.data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <p className="card p-6 text-ink-soft">Aucune annonce dans cet état.</p>
      ) : (
        <ul className="space-y-4">
          {query.data.items.map((l) => (
            <ListingCard key={l.id} listing={l} canDecide={can(admin, 'vendeurs:valider')} />
          ))}
        </ul>
      )}
      <Pagination page={page} pageCount={pageCount(query.data)} onChange={setPage} />
    </div>
  );
}

/** Signalements des acheteurs : classer sans suite ou retenir ; l'action sur l'annonce passe par sa décision. */
export function ReportsTab() {
  const admin = useAdminAuthStore((s) => s.admin);
  const [status, setStatus] = useState<ListingReport['status']>('open');
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['admin', 'marketplace', 'reports', status, page],
    queryFn: ({ signal }) => adminMarketplaceBackend.reports(status, page, signal),
    placeholderData: keepPreviousData,
  });
  const decide = useAdminMutation(
    ({ id, verdict }: { id: string; verdict: 'dismissed' | 'upheld' }) =>
      adminMarketplaceBackend.decideReport(id, verdict),
    (v) => (v.verdict === 'upheld' ? 'Signalement retenu' : 'Signalement classé sans suite'),
  );

  return (
    <div className="space-y-4">
      <SelectField
        label="Signalements"
        value={status}
        onChange={(e) => {
          setStatus(e.target.value === 'dismissed' ? 'dismissed' : e.target.value === 'upheld' ? 'upheld' : 'open');
          setPage(1);
        }}
      >
        <option value="open">À traiter</option>
        <option value="upheld">Retenus</option>
        <option value="dismissed">Classés sans suite</option>
      </SelectField>
      {query.isLoading ? (
        <PageLoader />
      ) : query.isError || !query.data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <p className="card p-6 text-ink-soft">Aucun signalement.</p>
      ) : (
        <ul className="card divide-y divide-sage text-sm">
          {query.data.items.map((r) => (
            <li key={r.id} className="space-y-1.5 p-4">
              <p>
                <Link to={`/annonces/${r.listing.slug}`} className="font-semibold hover:text-forest">
                  {r.listing.title}
                </Link>{' '}
                <span className="text-ink-muted">({r.listing.shopName})</span>
              </p>
              <p>
                <strong>{reportLabel[r.reason]}</strong>
                {r.comment && ` : ${r.comment}`}
              </p>
              <p className="text-xs text-ink-muted">Signalé le {formatDateTime(r.createdAt)}</p>
              {r.status === 'open' && can(admin, 'vendeurs:valider') && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => decide.mutate({ id: r.id, verdict: 'upheld' })}>
                    Retenir
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: r.id, verdict: 'dismissed' })}>
                    Classer sans suite
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageCount={pageCount(query.data)} onChange={setPage} />
      <p className="text-xs text-ink-muted">
        Retenir un signalement ne masque pas l’annonce : décidez-en dans l’onglet des annonces (Masquer ou Refuser).
      </p>
    </div>
  );
}
