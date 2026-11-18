import { Link } from 'react-router';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { ButtonLink } from '@/components/ui/Button';
import { LISTING_STATUSES, listingStatusLabel } from '@/features/seller/seller.backend';
import { useSellerDashboard } from '@/features/seller/seller.queries';
import { pluralize } from '@/utils/text';

function Tile({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link to={to} className="card block p-4 hover:border-forest">
      <span className="block text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-sm text-ink-soft">{label}</span>
    </Link>
  );
}

/** Tableau de bord du vendeur (32.8) : ce qui attend une action, l'état des annonces et leurs visites. */
export default function SellerDashboardPage() {
  const { data, isLoading, error, refetch } = useSellerDashboard();
  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const counts = LISTING_STATUSES.flatMap((s) => (data.listings[s] ? [{ status: s, count: data.listings[s] }] : []));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile label="Demandes à traiter" value={data.requests.awaitingAnswer} to="/vendeur/demandes" />
        <Tile label="Ventes acceptées en cours" value={data.requests.accepted} to="/vendeur/demandes" />
        <Tile
          label="Conversations qui vous attendent"
          value={data.conversations.awaitingSeller}
          to="/vendeur/messages"
        />
      </div>

      <section className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg">Mes annonces</h2>
          <ButtonLink to="/vendeur/annonces/nouvelle" size="sm">
            Nouvelle annonce
          </ButtonLink>
        </div>
        {counts.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucune annonce pour le moment.</p>
        ) : (
          <ul className="flex flex-wrap gap-2 text-sm">
            {counts.map(({ status, count }) => (
              <li key={status}>
                <Link
                  to={`/vendeur/annonces?etat=${status}`}
                  className="inline-block rounded-md border border-sage px-3 py-1.5 hover:border-forest"
                >
                  {listingStatusLabel[status]} : <strong>{count}</strong>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-lg">Visites des {data.views.periodDays} derniers jours</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {pluralize(data.views.total, 'visite')} sur vos annonces. Seuls des totaux sont comptés, aucune donnée sur les
          visiteurs.
        </p>
        {data.views.topListings.length > 0 && (
          <ol className="mt-3 space-y-1.5 text-sm">
            {data.views.topListings.map((l) => (
              <li key={l.id} className="flex justify-between gap-3">
                <Link to={`/vendeur/annonces/${l.id}`} className="truncate hover:text-forest">
                  {l.title}
                </Link>
                <span className="shrink-0 tabular-nums">{pluralize(l.views, 'visite')}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
