import { useParams } from 'react-router';
import { getErrorMessage } from '@/api/ApiError';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { orderStatusLabel, paymentStatusLabel } from '@/features/orders/orders.constants';
import type { Order } from '@/features/orders/orders.types';
import { useSellerAction, useSellerOrder } from '@/features/seller/seller.queries';
import { nextSellerAction, sellerOrdersBackend } from '@/features/seller/sellerOrders.backend';
import { toast } from '@/stores/toastStore';
import { formatDateTime } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';

const PAYMENT = { cash: 'Espèces', airtel: 'Airtel Money', moov: 'Moov Money' } as const;

/** Une commande reçue par la boutique : préparation et livraison selon l'organisation choisie. */
export default function SellerOrderPage() {
  const { id } = useParams();
  const order = useSellerOrder(id);
  if (order.isLoading) return <PageLoader />;
  if (order.isError || !order.data)
    return <ErrorState title="Commande introuvable" error={order.error} onRetry={() => void order.refetch()} />;
  return <OrderPanel order={order.data} />;
}

function OrderPanel({ order }: { order: Order }) {
  const act = useSellerAction((fn: () => Promise<Order>) => fn());
  const run = (fn: () => Promise<Order>, done: string) =>
    act.mutate(fn, {
      onSuccess: () => toast.success(done),
      onError: (err) => toast.error('Action impossible', { description: getErrorMessage(err) }),
    });

  const todo = nextSellerAction(order);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-mono text-lg">{order.number}</h2>
          <Badge tone="neutral">{orderStatusLabel[order.status]}</Badge>
        </div>
        <p className="text-sm text-ink-soft">
          Passée le {formatDateTime(order.createdAt)} ·{' '}
          {order.fulfilledBy === 'seller' ? 'vous livrez cette commande' : 'un livreur OKOZA la récupère chez vous'}
        </p>
        <ul className="divide-y divide-sage text-sm">
          {order.items.map((i) => (
            <li key={i.variantId} className="flex items-center gap-3 py-2">
              <img src={i.image} alt="" className="size-12 rounded-md object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{i.name}</span>
                <span className="text-ink-muted">
                  {i.variantLabel} · {i.quantity} × {formatPrice(i.unitPrice)}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-ink-muted">Articles</dt>
          <dd className="text-right tabular-nums">{formatPrice(order.totals.subtotal)}</dd>
          <dt className="text-ink-muted">Livraison</dt>
          <dd className="text-right tabular-nums">{formatPrice(order.totals.deliveryFee)}</dd>
          <dt className="font-semibold">Total de la commande</dt>
          <dd className="text-right font-semibold tabular-nums">{formatPrice(order.totals.total)}</dd>
          <dt className="text-ink-muted">Paiement</dt>
          <dd className="text-right">
            {PAYMENT[order.paymentMethod]} à la livraison · {paymentStatusLabel[order.paymentStatus]}
          </dd>
        </dl>
        <ol className="space-y-1 border-t border-sage pt-3 text-sm text-ink-soft">
          {order.history.map((h, i) => (
            <li key={i}>
              {formatDateTime(h.at)} : {orderStatusLabel[h.status]}
              {h.note ? `. ${h.note}` : ''}
            </li>
          ))}
        </ol>
      </section>

      <aside className="space-y-4">
        <section className="card space-y-2 p-5 text-sm">
          <h2 className="text-base">Client</h2>
          <p className="font-semibold">{order.customer.recipient}</p>
          <p>
            <a href={`tel:${order.customer.phone}`} className="text-forest hover:underline">
              {order.customer.phone}
            </a>
          </p>
          <p>
            {order.customer.zoneName}, {order.customer.landmark}
          </p>
          {order.customer.instructions && <p className="text-ink-soft">{order.customer.instructions}</p>}
        </section>

        {todo && (
          <Button
            className="w-full"
            loading={act.isPending}
            onClick={() =>
              run(
                () =>
                  order.status === 'courier_assigned'
                    ? sellerOrdersBackend.confirmHandover(order.id)
                    : sellerOrdersBackend.advance(order.id),
                order.status === 'courier_assigned' ? 'Remise au livreur confirmée' : 'Commande mise à jour',
              )
            }
          >
            {todo}
          </Button>
        )}
        {!todo && order.fulfilledBy === 'okoza' && order.status === 'ready' && (
          <p className="card p-4 text-sm text-ink-soft">
            Commande prête. Le livreur OKOZA sera affecté quand toutes les boutiques de la tournée auront terminé leur
            préparation. Gardez-la emballée avec son numéro.
          </p>
        )}
        {!todo &&
          order.fulfilledBy === 'okoza' &&
          order.status === 'courier_assigned' &&
          order.collectionConfirmedAt && (
            <p className="card p-4 text-sm text-ink-soft">
              Remise confirmée par {order.collectionConfirmedBy ?? 'votre boutique'} le{' '}
              {formatDateTime(order.collectionConfirmedAt)}. Le livreur partira après les autres collectes.
            </p>
          )}
      </aside>
    </div>
  );
}
