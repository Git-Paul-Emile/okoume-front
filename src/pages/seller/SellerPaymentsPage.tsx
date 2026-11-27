import { useState } from 'react';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { paymentMethodLabel, paymentStatusLabel } from '@/features/orders/orders.constants';
import { useSellerOrders, useSellerPayouts } from '@/features/seller/seller.queries';
import { formatDateTime } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';

const PAYOUT_STATUS = { pending: 'En attente', paid: 'Reversé', cancelled: 'Annulé' } as const;
const PAYOUT_METHOD = { cash: 'Espèces', airtel: 'Airtel Money', moov: 'Moov Money' } as const;

/** Consultation des paiements de commandes et reversements de la boutique connectée. */
export default function SellerPaymentsPage() {
  const [orderPage, setOrderPage] = useState(1);
  const [payoutPage, setPayoutPage] = useState(1);
  const orders = useSellerOrders(undefined, orderPage);
  const payouts = useSellerPayouts(payoutPage);

  if (orders.isLoading || payouts.isLoading) return <PageLoader />;
  if (orders.error || payouts.error || !orders.data || !payouts.data) {
    const error = orders.error ?? payouts.error;
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          void orders.refetch();
          void payouts.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-xl">Paiements et reversements</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Consultez les paiements associés à vos commandes et les reversements de votre boutique.
        </p>
      </header>

      <section className="space-y-3" aria-labelledby="seller-order-payments">
        <div>
          <h3 id="seller-order-payments" className="text-lg">
            Paiements des commandes
          </h3>
          <p className="text-sm text-ink-soft">Montant, moyen choisi et état du paiement pour chaque commande.</p>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <caption className="sr-only">Paiements des commandes de la boutique</caption>
            <thead>
              <tr className="border-b border-sage bg-ivory/60">
                <th className="px-4 py-3 text-left text-xs text-ink-muted">Commande</th>
                <th className="px-4 py-3 text-left text-xs text-ink-muted">Date</th>
                <th className="px-4 py-3 text-left text-xs text-ink-muted">Moyen</th>
                <th className="px-4 py-3 text-right text-xs text-ink-muted">Montant</th>
                <th className="px-4 py-3 text-left text-xs text-ink-muted">Paiement</th>
              </tr>
            </thead>
            <tbody>
              {orders.data.items.map((order) => (
                <tr key={order.id} className="border-b border-sage/70 last:border-0">
                  <td className="px-4 py-3 font-mono font-semibold">{order.number}</td>
                  <td className="px-4 py-3">{formatDateTime(order.createdAt)}</td>
                  <td className="px-4 py-3">{paymentMethodLabel[order.paymentMethod]}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatPrice(order.totals.total)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={order.paymentStatus === 'paid' ? 'forest' : 'warning'}>
                      {paymentStatusLabel[order.paymentStatus]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.data.items.length === 0 && <p className="p-6 text-center text-ink-muted">Aucune commande.</p>}
        </div>
        <Pagination
          page={orderPage}
          pageCount={Math.max(1, Math.ceil(orders.data.total / orders.data.limit))}
          onChange={setOrderPage}
        />
      </section>

      <section className="space-y-3" aria-labelledby="seller-payouts">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 id="seller-payouts" className="text-lg">
              Reversements
            </h3>
            <p className="text-sm text-ink-soft">
              Reversements dus : <strong>{formatPrice(payouts.data.due)}</strong>
            </p>
          </div>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <caption className="sr-only">Reversements de votre boutique</caption>
            <thead>
              <tr className="border-b border-sage bg-ivory/60">
                <th className="px-4 py-3 text-left text-xs text-ink-muted">Commande</th>
                <th className="px-4 py-3 text-left text-xs text-ink-muted">Date</th>
                <th className="px-4 py-3 text-right text-xs text-ink-muted">Encaissé</th>
                <th className="px-4 py-3 text-right text-xs text-ink-muted">Retenu</th>
                <th className="px-4 py-3 text-right text-xs text-ink-muted">Montant vendeur</th>
                <th className="px-4 py-3 text-left text-xs text-ink-muted">État</th>
              </tr>
            </thead>
            <tbody>
              {payouts.data.items.map((payout) => (
                <tr key={payout.id} className="border-b border-sage/70 last:border-0">
                  <td className="px-4 py-3 font-mono font-semibold">{payout.order.number}</td>
                  <td className="px-4 py-3">{formatDateTime(payout.paidAt ?? payout.createdAt)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatPrice(payout.collected)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatPrice(payout.deliveryFee + payout.commission)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatPrice(payout.amount)}</td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={payout.status === 'paid' ? 'forest' : payout.status === 'pending' ? 'warning' : 'neutral'}
                    >
                      {PAYOUT_STATUS[payout.status]}
                    </Badge>
                    {payout.method && (
                      <span className="mt-1 block text-xs text-ink-muted">{PAYOUT_METHOD[payout.method]}</span>
                    )}
                    {payout.reference && <span className="block text-xs text-ink-muted">Réf. {payout.reference}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payouts.data.items.length === 0 && <p className="p-6 text-center text-ink-muted">Aucun reversement.</p>}
        </div>
        <Pagination
          page={payoutPage}
          pageCount={Math.max(1, Math.ceil(payouts.data.total / payouts.data.limit))}
          onChange={setPayoutPage}
        />
      </section>
    </div>
  );
}
