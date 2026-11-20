import { Clock, FileText } from 'lucide-react';
import { Link } from 'react-router';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { useSettings } from '@/features/settings/settings.queries';
import { formatPrice } from '@/utils/formatPrice';
import { useDecideFeeChange } from '../orders.queries';
import { formatDateTime } from '@/utils/formatDate';
import { orderStatusLabel, paymentMethodLabel, paymentStatusLabel } from '../orders.constants';
import type { Order, ReturnRequest } from '../orders.types';
import { CancelOrderDialog } from './CancelOrderDialog';
import { OrderMessageDialog, PaymentChangeDialog } from './OrderRequests';
import { OrderItems, OrderTotalsTable } from './OrderSummary';
import { OrderTimeline } from './OrderTimeline';
import { ReturnRequestDialog } from './ReturnRequestDialog';

const returnStep: Partial<Record<ReturnRequest['status'], string>> = {
  accepted: 'renvoyez le colis',
  expected: 'colis attendu',
  received: 'colis reçu, inspection en cours',
  refund_due: 'inspection conforme, remboursement en cours',
  refunded: 'remboursé',
  closed: 'dossier clôturé',
};

function returnMessage(r: ReturnRequest) {
  if (r.status === 'pending')
    return `Demande de retour envoyée le ${formatDateTime(r.createdAt)}, décision en attente.`;
  if (r.status === 'refused')
    return `Retour refusé${r.decisionReason ? ` : ${r.decisionReason}` : ''}.${r.reopenRequestedAt ? ' Demande de réouverture envoyée.' : ''}`;
  if (r.status === 'closed' && r.decisionReason) return `Retour clôturé : ${r.decisionReason}.`;
  return `Retour accepté : ${returnStep[r.status] ?? 'en cours'}.`;
}

/** Détail d'une commande : utilisé par le suivi invité et l'espace client. */
export function OrderDetailPanel({ order: initial, inAccount = false }: { order: Order; inAccount?: boolean }) {
  const [order, setOrder] = useState(initial);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [dialog, setDialog] = useState<'payment' | 'dispute' | 'reopen' | null>(null);
  const { data: settings } = useSettings();
  const [now] = useState(() => Date.now());
  // Les démarches sur la commande demandent une session : elles se font depuis le compte
  const canAct = inAccount;

  const deliveredAt = order.history.find((h) => h.status === 'delivered')?.at;
  const returnWindow = settings?.returnWindowDays ?? 7;
  const canReturn =
    canAct &&
    order.status === 'delivered' &&
    !order.returnRequest &&
    deliveredAt &&
    now - new Date(deliveredAt).getTime() < returnWindow * 86_400_000;
  const canCancel =
    canAct && !['delivered', 'cancelled', 'shipping'].includes(order.status) && !order.cancellationRequest;
  const active = !['delivered', 'cancelled', 'claim'].includes(order.status);
  const canChangePayment =
    canAct && active && order.paymentStatus === 'awaiting_payment' && order.paymentChangeRequest?.status !== 'pending';
  const canDispute = canAct && order.status === 'delivered' && !order.deliveryDispute;
  const reopenDays = settings?.reopenWindowDays ?? 15;
  const refusedAt = order.returnRequest?.status === 'refused' ? order.returnRequest.createdAt : null;
  const canReopenReturn =
    canAct &&
    !!refusedAt &&
    !order.returnRequest?.reopenRequestedAt &&
    now - new Date(refusedAt).getTime() < reopenDays * 86_400_000;
  const canInvoice = inAccount && ['paid', 'refund_due', 'refunded'].includes(order.paymentStatus);
  const change = order.paymentChangeRequest;

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-mono text-xl">{order.number}</h2>
            <p className="mt-1 text-xs text-ink-muted">Commande du {formatDateTime(order.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={order.status === 'cancelled' ? 'danger' : 'forest'}>{orderStatusLabel[order.status]}</Badge>
            <Badge tone={order.paymentStatus === 'paid' ? 'forest' : 'warning'}>
              {paymentStatusLabel[order.paymentStatus]}
            </Badge>
          </div>
        </div>
        <OrderTimeline order={order} />

        {!!order.trackedOrders?.length && order.trackedOrders.length > 1 && (
          <section className="mt-5 rounded-md bg-ivory p-4">
            <h3 className="font-semibold">Suivi des boutiques</h3>
            <ul className="mt-2 divide-y divide-sage text-sm">
              {order.trackedOrders.map((stop) => (
                <li key={stop.number} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <span className="block font-medium">{stop.shopName}</span>
                    <span className="text-xs text-ink-muted">
                      {stop.fulfilledBy === 'okoume'
                        ? stop.collectionConfirmedAt
                          ? `Collecte confirmée le ${formatDateTime(stop.collectionConfirmedAt)}`
                          : 'Collecte par le livreur OKOUMÉ'
                        : 'Livraison indépendante par la boutique'}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block">{orderStatusLabel[stop.status]}</span>
                    <span className="text-xs text-ink-muted">{formatPrice(stop.total)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {order.cancellationRequest && order.cancellationRequest.status === 'pending' && (
          <p className="mt-6 flex items-center gap-2 rounded-md bg-[#fbf1dc] p-3 text-sm text-warning">
            <Clock className="size-4" /> Demande d’annulation en cours d’examen ({order.cancellationRequest.reason}). La
            commande reste active jusqu’à la décision.
          </p>
        )}
        {order.returnRequest && (
          <p className="mt-6 flex items-center gap-2 rounded-md bg-forest-50 p-3 text-sm text-forest">
            <Clock className="size-4 shrink-0" />
            {returnMessage(order.returnRequest)}
          </p>
        )}
        {change && (
          <p className="mt-6 flex items-center gap-2 rounded-md bg-ivory p-3 text-sm text-ink-soft">
            <Clock className="size-4 shrink-0" />
            {change.status === 'pending'
              ? `Changement vers ${paymentMethodLabel[change.to]} demandé, en attente de l’accord de la boutique.`
              : change.status === 'accepted'
                ? `Moyen de paiement changé : ${paymentMethodLabel[change.to]} au lieu de ${paymentMethodLabel[change.from]}.`
                : `Changement de paiement refusé${change.decisionReason ? ` : ${change.decisionReason}` : ''}.`}
          </p>
        )}
        {order.deliveryFeeChange?.status === 'pending' && canAct && <FeeChangeNotice order={order} />}
        {order.deliveryDispute && (
          <p className="mt-6 flex items-center gap-2 rounded-md bg-[#fbf1dc] p-3 text-sm text-warning">
            <Clock className="size-4 shrink-0" />
            <span>
              {order.deliveryDispute.status === 'resolved'
                ? `Réclamation traitée${order.deliveryDispute.resolution ? ` : ${order.deliveryDispute.resolution}` : '.'}`
                : `Réclamation${order.deliveryDispute.ticketNumber ? ` ${order.deliveryDispute.ticketNumber}` : ''} ouverte : nous enquêtons auprès du livreur.`}{' '}
              {inAccount && order.deliveryDispute.ticketNumber && (
                <Link
                  to={`/compte/assistance/${order.deliveryDispute.ticketNumber}`}
                  className="font-semibold underline"
                >
                  Suivre la réclamation
                </Link>
              )}
            </span>
          </p>
        )}

        {(canCancel || canReturn || canChangePayment || canDispute || canReopenReturn || canInvoice) && (
          <div className="mt-6 flex flex-wrap gap-3 border-t border-sage pt-5">
            {canCancel && (
              <Button variant="danger" size="sm" onClick={() => setCancelOpen(true)}>
                {order.status === 'confirmed' ? 'Annuler la commande' : 'Demander l’annulation'}
              </Button>
            )}
            {canReturn && (
              <Button variant="outline" size="sm" onClick={() => setReturnOpen(true)}>
                Demander un retour
              </Button>
            )}
            {canChangePayment && (
              <Button variant="outline" size="sm" onClick={() => setDialog('payment')}>
                Changer de moyen de paiement
              </Button>
            )}
            {canReopenReturn && (
              <Button variant="outline" size="sm" onClick={() => setDialog('reopen')}>
                Demander la réouverture du retour
              </Button>
            )}
            {canInvoice && (
              <ButtonLink
                to={`/facture/${order.number}`}
                variant="outline"
                size="sm"
                icon={<FileText className="size-4" />}
              >
                {order.paymentStatus === 'paid' ? 'Facture' : 'Facture et avoirs'}
              </ButtonLink>
            )}
            {canDispute && (
              <button
                type="button"
                onClick={() => setDialog('dispute')}
                className="px-1 text-sm font-semibold text-ink-soft hover:text-danger hover:underline"
              >
                Je n’ai pas reçu ma commande
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="card p-6">
          <h3 className="mb-2 text-base">Articles</h3>
          <OrderItems order={order} />
        </div>
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="mb-3 text-base">Montant</h3>
            <OrderTotalsTable order={order} />
          </div>
          <div className="card p-6 text-sm">
            <h3 className="mb-2 text-base">Livraison</h3>
            {/* Suivi sans compte sur l'API : seules la zone et les étapes sont transmises, pas les coordonnées */}
            <p className="text-ink-soft">
              {order.customer.recipient && (
                <>
                  {order.customer.recipient}
                  <br />
                </>
              )}
              {order.customer.phone && (
                <>
                  {order.customer.phone}
                  <br />
                </>
              )}
              {[order.customer.zoneName, order.customer.landmark].filter(Boolean).join(', ')}
            </p>
            {order.customer.instructions && <p className="mt-1 text-ink-muted">« {order.customer.instructions} »</p>}
          </div>
        </div>
      </div>

      <CancelOrderDialog order={order} open={cancelOpen} onClose={() => setCancelOpen(false)} onDone={setOrder} />
      <ReturnRequestDialog order={order} open={returnOpen} onClose={() => setReturnOpen(false)} onDone={setOrder} />
      {dialog === 'payment' && <PaymentChangeDialog order={order} onClose={() => setDialog(null)} onDone={setOrder} />}
      {(dialog === 'dispute' || dialog === 'reopen') && (
        <OrderMessageDialog order={order} kind={dialog} onClose={() => setDialog(null)} onDone={setOrder} />
      )}
    </div>
  );
}

/** Nouveaux frais de livraison proposés par la boutique : la livraison attend la réponse du client (9.5). */
function FeeChangeNotice({ order }: { order: Order }) {
  const decide = useDecideFeeChange();
  const change = order.deliveryFeeChange!;
  return (
    <div className="mt-6 rounded-md bg-[#fbf1dc] p-4 text-sm" role="status">
      <p className="font-semibold text-warning">Nouveaux frais de livraison à confirmer</p>
      <p className="mt-1 text-ink-soft">
        {formatPrice(change.from)} deviennent {formatPrice(change.to)}
        {change.reason && ` : ${change.reason}`}. Votre total passerait à{' '}
        {formatPrice(order.totals.total + change.to - change.from)}. La livraison reprend après votre réponse.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" loading={decide.isPending} onClick={() => decide.mutate({ order, accept: true })}>
          Accepter les nouveaux frais
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={decide.isPending}
          onClick={() => decide.mutate({ order, accept: false })}
        >
          Refuser
        </Button>
      </div>
    </div>
  );
}
