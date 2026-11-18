import { ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { getErrorMessage } from '@/api/ApiError';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { ReasonDialog } from '@/features/admin/components/ReasonDialog';
import {
  handoverLabel,
  paymentLabel,
  requestStatusLabel,
  type ListingRequest,
} from '@/features/marketplace/marketplace.backend';
import { useCancelListingRequest, useMyListingRequests } from '@/features/marketplace/marketplace.queries';
import { toast } from '@/stores/toastStore';
import { formatDateTime } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';

const tone = (status: ListingRequest['status']) =>
  status === 'accepted' || status === 'concluded' ? 'forest' : status === 'sent' ? 'warning' : 'neutral';

/** Demandes de commande envoyées aux vendeurs (32.7) : suivi, coordonnées du vendeur après acceptation. */
export default function AccountRequestsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useMyListingRequests(page);
  const cancel = useCancelListingRequest();
  const [cancelling, setCancelling] = useState<ListingRequest | null>(null);

  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <div>
      <h1 className="mb-5 text-2xl">Mes demandes aux vendeurs</h1>
      {data.items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<ShoppingBag className="size-7" />}
            title="Aucune demande envoyée"
            description="Depuis une annonce, « Demander à acheter » envoie votre demande au vendeur."
            action={<ButtonLink to="/annonces">Voir les annonces</ButtonLink>}
          />
        </div>
      ) : (
        <ul className="space-y-4">
          {data.items.map((r) => (
            <li key={r.id} className="card space-y-2 p-5 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-ink-muted">{r.number}</p>
                  <Link to={`/annonces/${r.listing.slug}`} className="font-semibold hover:text-forest">
                    {r.listing.title}
                  </Link>
                  <p className="text-ink-muted">{r.shop.name}</p>
                </div>
                <Badge tone={tone(r.status)}>{requestStatusLabel[r.status]}</Badge>
              </div>
              <p>
                {r.quantity !== null && `${r.quantity} × ${formatPrice(r.unitPrice)}, `}
                total <strong>{formatPrice(r.total)}</strong>. {paymentLabel[r.paymentMethod]},{' '}
                {handoverLabel[r.handover].toLowerCase()}.
              </p>
              {r.shop.phone && (
                <p className="rounded-md bg-forest-50 p-3 text-forest">
                  Téléphone du vendeur : <a href={`tel:${r.shop.phone.replace(/\s/g, '')}`}>{r.shop.phone}</a>. Convenez
                  ensemble du paiement et de la remise.
                </p>
              )}
              {r.reason && <p className="text-ink-muted">Motif : {r.reason}</p>}
              <p className="text-xs text-ink-muted">Envoyée le {formatDateTime(r.createdAt)}</p>
              {(r.status === 'sent' || r.status === 'accepted') && (
                <Button size="sm" variant="outline" onClick={() => setCancelling(r)}>
                  Annuler la demande
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6">
        <Pagination page={page} pageCount={Math.max(1, Math.ceil(data.total / data.limit))} onChange={setPage} />
      </div>
      <ReasonDialog
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        title="Annuler la demande"
        description="Le vendeur est prévenu. Le motif l’aide à comprendre votre choix."
        confirmLabel="Annuler la demande"
        danger
        loading={cancel.isPending}
        onConfirm={(reason) =>
          cancelling &&
          cancel.mutate(
            { id: cancelling.id, reason },
            {
              onSuccess: () => {
                toast.success('Demande annulée');
                setCancelling(null);
              },
              onError: (err) => toast.error('Annulation impossible', { description: getErrorMessage(err) }),
            },
          )
        }
      />
    </div>
  );
}
