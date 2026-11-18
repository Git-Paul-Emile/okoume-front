import { Package } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { orderStatusLabel, paymentStatusLabel } from '@/features/orders/orders.constants';
import { ClaimOrderForm } from '@/features/orders/components/ClaimOrderForm';
import { useMyOrders } from '@/features/orders/orders.queries';
import { formatDate } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';
import { pluralize } from '@/utils/text';

export default function AccountOrdersPage() {
  const { data: orders, isLoading, error, refetch } = useMyOrders();

  return (
    <div>
      <h1 className="mb-5 text-2xl">Mes commandes</h1>
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
      ) : !orders?.length ? (
        <div className="card">
          <EmptyState
            icon={<Package className="size-7" />}
            title="Aucune commande pour le moment"
            action={<ButtonLink to="/catalogue">Découvrir le catalogue</ButtonLink>}
          />
        </div>
      ) : (
        <RevealGroup className="space-y-3">
          {orders.map((o) => (
            <RevealItem key={o.id}>
              <Link
                to={`/compte/commandes/${o.number}`}
                className="card flex flex-col gap-4 p-5 transition hover:border-forest sm:flex-row sm:items-center"
              >
                <div className="flex -space-x-3">
                  {o.items.slice(0, 3).map((i) => (
                    <img
                      key={i.variantId}
                      src={i.image}
                      alt=""
                      className="size-14 rounded-md border-2 border-white bg-ivory object-contain p-1 shadow-sm"
                    />
                  ))}
                </div>
                <div className="flex-1">
                  <p className="font-mono font-bold">{o.number}</p>
                  <p className="text-sm text-ink-muted">
                    {formatDate(o.createdAt)} ·{' '}
                    {pluralize(
                      o.items.reduce((s, i) => s + i.quantity, 0),
                      'article',
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={o.status === 'cancelled' ? 'danger' : 'forest'}>{orderStatusLabel[o.status]}</Badge>
                  <Badge tone={o.paymentStatus === 'paid' ? 'neutral' : 'warning'}>
                    {paymentStatusLabel[o.paymentStatus]}
                  </Badge>
                </div>
                <p className="text-lg font-extrabold tabular-nums">{formatPrice(o.totals.total)}</p>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      )}
      <ClaimOrderForm />
    </div>
  );
}
