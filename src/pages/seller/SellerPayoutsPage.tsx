import { useSearchParams } from 'react-router';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { useSellerPayouts } from '@/features/seller/seller.queries';
import { formatDate } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';

const METHOD = { cash: 'espèces', airtel: 'Airtel Money', moov: 'Moov Money' } as const;

/**
 * Reversements de la boutique (cahier des charges 32.6) : ce que les livreurs Okoumé ont encaissé pour elle,
 * moins la livraison et la commission, et ce qu'Okoumé lui a déjà rendu.
 */
export default function SellerPayoutsPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const { data, isLoading, error, refetch } = useSellerPayouts(page);
  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <p className="text-sm text-ink-muted">Okoumé vous doit</p>
        <p className="text-2xl font-extrabold tabular-nums">{formatPrice(data.due)}</p>
        <p className="mt-1 text-sm text-ink-soft">
          Les commandes que vous livrez vous-même sont encaissées par vous : elles n’apparaissent pas ici.
        </p>
      </div>
      {data.items.length === 0 ? (
        <p className="card p-6 text-ink-soft">Aucun reversement pour le moment.</p>
      ) : (
        <ul className="card divide-y divide-sage text-sm">
          {data.items.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <span>
                <span className="block font-mono font-semibold">{p.order.number}</span>
                <span className="text-ink-muted">
                  Encaissé {formatPrice(p.collected)} · livraison {formatPrice(p.deliveryFee)} · commission{' '}
                  {formatPrice(p.commission)} ({p.commissionRate} %)
                </span>
              </span>
              <span className="text-right">
                <span className="block font-semibold tabular-nums">{formatPrice(p.amount)}</span>
                {p.status === 'paid' ? (
                  <Badge tone="forest">
                    Reversé le {p.paidAt ? formatDate(p.paidAt) : ''}
                    {p.method ? ` (${METHOD[p.method]})` : ''}
                  </Badge>
                ) : p.status === 'pending' ? (
                  <Badge tone="warning">À recevoir</Badge>
                ) : (
                  <Badge>Annulé</Badge>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={page}
        pageCount={Math.max(1, Math.ceil(data.total / data.limit))}
        onChange={(p) => setParams(p > 1 ? { page: String(p) } : {}, { replace: true })}
      />
    </div>
  );
}
