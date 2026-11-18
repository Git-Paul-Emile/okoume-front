import { useState } from 'react';
import { Link } from 'react-router';
import { getErrorMessage } from '@/api/ApiError';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { ReasonDialog } from '@/features/admin/components/ReasonDialog';
import { handoverLabel, paymentLabel, requestStatusLabel } from '@/features/marketplace/marketplace.backend';
import { sellerBackend, type SellerRequest } from '@/features/seller/seller.backend';
import { useSellerAction, useSellerRequests } from '@/features/seller/seller.queries';
import { toast } from '@/stores/toastStore';
import { formatDateTime } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';

type Decision = Parameters<typeof sellerBackend.decideRequest>[1];

const MESSAGES: Record<Decision['action'], string> = {
  accept: 'Demande acceptée : l’acheteur reçoit votre téléphone',
  refuse: 'Demande refusée',
  conclude: 'Vente conclue',
  not_concluded: 'Vente non conclue',
};

/** Demandes de commande reçues (32.7) : accepter, refuser, puis déclarer la vente conclue ou non. */
export default function SellerRequestsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useSellerRequests(page);
  const decide = useSellerAction(({ id, decision }: { id: string; decision: Decision }) =>
    sellerBackend.decideRequest(id, decision),
  );
  const [asking, setAsking] = useState<{ request: SellerRequest; action: 'refuse' | 'not_concluded' } | null>(null);

  const run = (request: SellerRequest, decision: Decision) =>
    decide.mutate(
      { id: request.id, decision },
      {
        onSuccess: () => {
          toast.success(MESSAGES[decision.action]);
          setAsking(null);
        },
        onError: (err) => toast.error('Action impossible', { description: getErrorMessage(err) }),
      },
    );

  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <div>
      {data.items.length === 0 ? (
        <p className="card p-6 text-ink-soft">Aucune demande reçue pour le moment.</p>
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
                  <p className="text-ink-muted">De {r.buyer.firstName}</p>
                </div>
                <Badge tone={r.status === 'sent' ? 'warning' : r.status === 'accepted' ? 'forest' : 'neutral'}>
                  {requestStatusLabel[r.status]}
                </Badge>
              </div>
              <p>
                {r.quantity !== null && `${r.quantity} × ${formatPrice(r.unitPrice)}, `}
                total <strong>{formatPrice(r.total)}</strong>. {paymentLabel[r.paymentMethod]},{' '}
                {handoverLabel[r.handover].toLowerCase()}.
              </p>
              {r.message && <p className="rounded-md bg-ivory p-3">« {r.message} »</p>}
              {r.buyer.phone && (
                <p className="text-forest">
                  Téléphone de l’acheteur : <a href={`tel:${r.buyer.phone.replace(/\s/g, '')}`}>{r.buyer.phone}</a>
                </p>
              )}
              {r.reason && <p className="text-ink-muted">Motif : {r.reason}</p>}
              <p className="text-xs text-ink-muted">Reçue le {formatDateTime(r.createdAt)}</p>
              {r.status === 'sent' && (
                <div className="flex gap-2">
                  <Button size="sm" loading={decide.isPending} onClick={() => run(r, { action: 'accept' })}>
                    Accepter
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAsking({ request: r, action: 'refuse' })}>
                    Refuser
                  </Button>
                </div>
              )}
              {r.status === 'accepted' && (
                <div className="flex gap-2">
                  <Button size="sm" loading={decide.isPending} onClick={() => run(r, { action: 'conclude' })}>
                    Vente conclue
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAsking({ request: r, action: 'not_concluded' })}
                  >
                    Vente non conclue
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6">
        <Pagination page={page} pageCount={Math.max(1, Math.ceil(data.total / data.limit))} onChange={setPage} />
      </div>
      <ReasonDialog
        open={!!asking}
        onClose={() => setAsking(null)}
        title={asking?.action === 'refuse' ? 'Refuser la demande' : 'Vente non conclue'}
        description="Le motif est communiqué à l’acheteur."
        confirmLabel="Confirmer"
        loading={decide.isPending}
        onConfirm={(reason) => asking && run(asking.request, { action: asking.action, reason })}
      />
    </div>
  );
}
