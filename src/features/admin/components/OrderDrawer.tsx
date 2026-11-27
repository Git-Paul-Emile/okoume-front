import { useQuery } from '@tanstack/react-query';
import { Phone } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { orderStatusLabel, paymentMethodLabel } from '@/features/orders/orders.constants';
import { formatDateTime } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';
import { adminOrdersBackend } from '../adminOrders.backend';
import { useAdminMutation, useCouriers } from '../admin.queries';
import type { AdminOrder } from '../admin.types';
import { AssignCourierDialog } from './AssignCourierDialog';
import { OrderStatusBadge, PaymentStatusBadge } from './StatusBadges';

type Dialog = 'courier' | null;

/** Détail d'une commande et étapes de traitement courantes. */
export function OrderDrawer({ order, onClose }: { order: AdminOrder | null; onClose: () => void }) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const { data: couriers = [] } = useCouriers();
  const payments = useQuery({
    queryKey: ['admin', 'payments', order?.id],
    queryFn: ({ signal }) => adminOrdersBackend.payments(order!, signal),
    enabled: !!order,
  });
  const update = useAdminMutation(
    ({ intent }: { message: string; intent: () => Promise<unknown> }) => intent(),
    (value) => value.message,
  );

  if (!order)
    return (
      <Drawer open={false} onClose={onClose} title="">
        {null}
      </Drawer>
    );

  const act = (intent: () => Promise<unknown>, message: string) =>
    update.mutate({ message, intent }, { onSuccess: () => setDialog(null) });
  const next: Partial<Record<AdminOrder['status'], string>> = {
    confirmed: 'Commencer la préparation',
    preparing: 'Marquer prête à livrer',
    ready: 'Assigner un livreur',
    courier_assigned: 'Marquer en livraison',
    shipping: 'Marquer livrée',
  };
  const paid = (payments.data?.payments ?? [])
    .filter((payment) => payment.kind === 'payment')
    .reduce((total, payment) => total + payment.amount, 0);
  const checkout = payments.data?.checkout ?? null;

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title={order.number}
        className="sm:max-w-lg"
        footer={
          <div className="flex flex-wrap gap-2">
            {next[order.status] && (
              <Button
                className="flex-1"
                loading={update.isPending}
                onClick={() =>
                  order.status === 'ready'
                    ? setDialog('courier')
                    : act(
                        () => adminOrdersBackend.transition(order, { action: 'advance' }, couriers),
                        `${order.number} : ${next[order.status]}`,
                      )
                }
              >
                {next[order.status]}
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-6 p-5 text-sm">
          <div className="flex flex-wrap gap-2">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
          {order.shop && (
            <p className="rounded-md bg-ivory p-3">
              Boutique : <strong>{order.shop.name}</strong>
            </p>
          )}

          {checkout && (
            <section className="rounded-md bg-ivory p-3">
              <h3 className="font-semibold">Paiement groupé {checkout.number ?? ''}</h3>
              <p>
                {checkout.orders} commande(s) · {formatPrice(checkout.total)}
              </p>
              {checkout.shops.length > 0 && <p className="text-ink-muted">{checkout.shops.join(', ')}</p>}
            </section>
          )}

          <section>
            <h3 className="mb-2 font-semibold">Client et livraison</h3>
            <p>{order.customer.recipient}</p>
            <a
              href={`tel:${order.customer.phone}`}
              className="inline-flex items-center gap-1.5 text-forest hover:underline"
            >
              <Phone className="size-3.5" aria-hidden="true" />
              {order.customer.phone}
            </a>
            <p>
              {order.customer.zoneName} · {order.customer.landmark}
            </p>
            {order.customer.instructions && <p className="text-ink-soft">{order.customer.instructions}</p>}
            {order.courier && <p className="text-ink-soft">Livreur : {order.courier}</p>}
          </section>

          <section>
            <h3 className="mb-2 font-semibold">
              Articles ({order.items.reduce((sum, item) => sum + item.quantity, 0)})
            </h3>
            <ul className="divide-y divide-sage">
              {order.items.map((item) => (
                <li key={item.variantId} className="flex items-center gap-3 py-2.5">
                  <img
                    src={item.image}
                    alt=""
                    className="size-11 rounded-md border border-sage bg-white object-contain p-0.5"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.name}</span>
                    <span className="block text-xs text-ink-muted">
                      {item.variantLabel} · {item.quantity} × {formatPrice(item.unitPrice)}
                    </span>
                  </span>
                  <strong>{formatPrice(item.unitPrice * item.quantity)}</strong>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 font-semibold">Paiement</h3>
            <p>
              {paymentMethodLabel[order.paymentMethod]} · {formatPrice(order.totals.total)}
            </p>
            <p className="text-ink-soft">Enregistré : {formatPrice(paid)}</p>
          </section>

          <section>
            <h3 className="mb-2 font-semibold">Historique</h3>
            <ol className="space-y-2 border-l-2 border-sage pl-4">
              {[...order.history].reverse().map((entry, index) => (
                <li key={`${entry.at}-${index}`}>
                  <p className="font-medium">{orderStatusLabel[entry.status]}</p>
                  <p className="text-xs text-ink-muted">
                    {formatDateTime(entry.at)}
                    {entry.by ? ` · ${entry.by}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </Drawer>

      {dialog === 'courier' && (
        <AssignCourierDialog
          order={order}
          loading={update.isPending}
          onClose={() => setDialog(null)}
          onAssign={(courier) =>
            act(
              () => adminOrdersBackend.transition(order, { action: 'assign_courier', courierId: courier.id }, couriers),
              `${order.number} confiée à ${courier.firstName} ${courier.lastName}`,
            )
          }
        />
      )}
    </>
  );
}
