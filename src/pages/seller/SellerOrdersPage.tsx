import { Link, useSearchParams } from 'react-router';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { SelectField } from '@/components/ui/TextField';
import { orderStatusLabel } from '@/features/orders/orders.constants';
import { useSellerOrders } from '@/features/seller/seller.queries';
import { nextSellerAction, SELLER_ORDER_STATUSES } from '@/features/seller/sellerOrders.backend';
import { formatDateTime } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';

/** Commandes reçues par la boutique (cahier des charges 32.4) : les plus récentes d'abord. */
export default function SellerOrdersPage() {
  const [params, setParams] = useSearchParams();
  const status = SELLER_ORDER_STATUSES.find((s) => s === params.get('etat'));
  const page = Number(params.get('page')) || 1;
  const { data, isLoading, error, refetch } = useSellerOrders(status, page);

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  return (
    <div>
      <div className="mb-4">
        <SelectField label="État" value={status ?? ''} onChange={(e) => set('etat', e.target.value || null)}>
          <option value="">Toutes les commandes</option>
          {SELLER_ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {orderStatusLabel[s]}
            </option>
          ))}
        </SelectField>
      </div>
      {isLoading ? (
        <PageLoader />
      ) : error || !data ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <p className="card p-6 text-ink-soft">
          Aucune commande {status ? 'dans cet état' : 'pour le moment'}. Les commandes de vos produits arrivent ici.
        </p>
      ) : (
        <ul className="card divide-y divide-sage">
          {data.items.map((o) => {
            const todo = nextSellerAction(o);
            return (
              <li key={o.id}>
                <Link
                  to={`/vendeur/commandes/${o.id}`}
                  className="flex flex-wrap items-center gap-3 p-3 hover:bg-ivory"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono font-semibold">{o.number}</span>
                    <span className="text-sm text-ink-soft">
                      {formatDateTime(o.createdAt)} · {o.customer.zoneName} · {formatPrice(o.totals.total)}
                    </span>
                  </span>
                  {todo && <Badge tone="warning">À faire : {todo.toLowerCase()}</Badge>}
                  <Badge tone={o.status === 'delivered' ? 'forest' : 'neutral'}>
                    {orderStatusLabel[o.status]}
                  </Badge>
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
