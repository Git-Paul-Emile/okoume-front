import { useQuery } from '@tanstack/react-query';
import { Phone } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { orderStatusLabel, paymentMethodLabel } from '@/features/orders/orders.constants';
import { formatDateTime } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';
import { adminOrdersBackend, type Transition } from '../adminOrders.backend';
import { adminCommerceBackend } from '../adminCommerce.backend';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { useAdminMutation, useAdminZones, useCouriers, useInvoices } from '../admin.queries';
import type { AdminOrder } from '../admin.types';
import { grossMargin } from '../dashboard.utils';
import { overpayment, paidAmount, remainingAmount, type PaymentInput, type RefundInput } from '../payments.rules';
import {
  canDecideReturn,
  canReopen,
  nextStatusAction,
  RETURN_STEPS,
} from '../orders.actions';
import { AssignCourierDialog } from './AssignCourierDialog';
import { DeliveryFailureDialog } from './DeliveryFailureDialog';
import { AmountReasonDialog } from './AmountReasonDialog';
import { RecordPaymentDialog, RefundDialog } from './PaymentDialogs';
import { ReasonDialog } from './ReasonDialog';
import { ReturnAcceptDialog } from './ReturnAcceptDialog';
import { OrderStatusBadge, PaymentStatusBadge } from './StatusBadges';

type Dialog =
  | 'cancel'
  | 'refuseCancel'
  | 'refuseReturn'
  | 'courier'
  | 'failure'
  | 'payment'
  | 'refund'
  | 'reopen'
  | 'deliveryCost'
  | 'resolveDispute'
  | 'acceptReturn'
  | 'clearReview'
  | null;

/** Détail d'une commande et toutes les actions de traitement, depuis n'importe quel écran des ventes. */
export function OrderDrawer({ order: listed, onClose }: { order: AdminOrder | null; onClose: () => void }) {
  const [dialog, setDialog] = useState<Dialog>(null);
  // Chaque action est une intention (transition, décision, encaissement) appliquée par le serveur
  const { data: couriers = [] } = useCouriers();
  const payments = useQuery({
    queryKey: ['admin', 'payments', listed?.id],
    queryFn: ({ signal }) => adminOrdersBackend.payments(listed!, signal),
    enabled: !!listed,
  });
  const order = listed ? { ...listed, payments: payments.data?.payments ?? [] } : listed;
  const admin = useAdminAuthStore((s) => s.admin);
  const { data: zones = [] } = useAdminZones();
  const { data: invoices = [] } = useInvoices();
  const update = useAdminMutation(
    ({ intent }: { message: string; intent: () => Promise<unknown> }) => intent(),
    (v) => v.message,
  );

  if (!order)
    return (
      <Drawer open={false} onClose={onClose} title="">
        {null}
      </Drawer>
    );

  /**
   * Action appliquée par l'API (stock, historique et auteur compris, 6.3 et 7.2) ; les données du
   * back-office sont relues ensuite.
   */
  const act = (intent: () => Promise<unknown>, message: string) =>
    update.mutate({ message, intent }, { onSuccess: () => setDialog(null) });
  const transition = (t: Transition, message: string) =>
    act(() => adminOrdersBackend.transition(order, t, couriers), message);

  const next = nextStatusAction[order.status];
  // Le plafond de remboursement de chaque membre est vérifié par le serveur
  const zoneCost = zones.find((z) => z.id === order.customer.zoneId)?.courierCost;
  // Commande signalée par l'API (19.3) : la préparation attend la vérification d'un membre autorisé
  const reviewPending = order.status === 'confirmed' && order.review?.status === 'pending';
  const blocked = reviewPending;
  const cancellable = !['delivered', 'cancelled', 'claim'].includes(order.status);
  // Tous les paiements se font à la livraison (espèces ou Mobile Money) : l'encaissement est confirmé ensuite
  const toCollect =
    order.paymentStatus === 'awaiting_payment' && ['courier_assigned', 'shipping', 'delivered'].includes(order.status);
  const checkoutPayment = payments.data?.checkout ?? null;
  // La facture est émise par le serveur quand la commande est payée
  const recordPayment = (input: PaymentInput) =>
    act(
      () => adminOrdersBackend.recordPayment(order, input),
      `${order.number} : ${formatPrice(input.amount)} enregistrés`,
    );
  // Stock non revendable et montant remboursable sont calculés par le serveur
  const confirmRefund = (input: RefundInput) =>
    act(
      () => adminOrdersBackend.refund(order, { ...input, clientAgreed: input.clientAgreed ?? false }),
      `Remboursement de ${order.number} confirmé (${formatPrice(input.amount)})`,
    );
  const cancelReq = order.cancellationRequest;
  const returnReq = order.returnRequest;
  const returnStep = RETURN_STEPS.find((s) => s.from === returnReq?.status);

  return (
    <>
      <Drawer
        open={!!order}
        onClose={onClose}
        title={order.number}
        className="sm:max-w-lg"
        footer={
          <div className="flex flex-wrap gap-2">
            {blocked && (
              <p className="w-full text-xs text-warning">
                Commande à vérifier avant de commencer la préparation.
              </p>
            )}
            {next && (
              <Button
                className="flex-1"
                disabled={blocked}
                loading={update.isPending}
                onClick={() =>
                  order.status === 'ready'
                    ? setDialog('courier')
                    : transition({ action: 'advance' }, `${order.number} : ${next}`)
                }
              >
                {next}
              </Button>
            )}
            {order.status === 'courier_assigned' &&
              order.fulfilledBy === 'okoume' &&
              !order.shop &&
              !order.collectionConfirmedAt && (
                <Button
                  variant="outline"
                  loading={update.isPending}
                  onClick={() =>
                    transition(
                      { action: 'confirm_collection' },
                      `${order.number} : collecte confirmée par la boutique OKOUMÉ`,
                    )
                  }
                >
                  Confirmer la collecte OKOUMÉ
                </Button>
              )}
            {(order.status === 'courier_assigned' || order.status === 'shipping') && (
              <Button variant="outline" onClick={() => setDialog('failure')}>
                Échec de livraison
              </Button>
            )}
            {cancellable && (
              <Button variant="danger" onClick={() => setDialog('cancel')}>
                Annuler la commande
              </Button>
            )}
            {order.status === 'delivered' && canReopen(admin) && (
              <Button variant="outline" onClick={() => setDialog('reopen')}>
                Rouvrir la commande
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
          {/* Commande d'une boutique de vendeur (32.4) : le vendeur la prépare ; il la livre s'il l'a choisi */}
          {order.shop && (
            <p className="rounded-md bg-ivory p-3">
              Boutique <span className="font-semibold">{order.shop.name}</span> :{' '}
              {order.fulfilledBy === 'seller'
                ? 'le vendeur prépare, livre et encaisse lui-même.'
                : 'le vendeur prépare et confirme la remise. Un livreur Okoumé regroupe les collectes et encaisse une seule fois à la livraison.'}
            </p>
          )}

          {checkoutPayment && (
            <Notice title={`Tournée centralisée ${checkoutPayment.number ?? ''}`}>
              Un seul livreur collecte les commandes prêtes de {checkoutPayment.shops.join(', ')}, puis les remet au
              client en une fois. Total à encaisser : {formatPrice(checkoutPayment.total)}.
            </Notice>
          )}

          {order.review?.status === 'pending' && (
            <Notice title="Commande à vérifier">
              Signaux relevés à la création :
              <ul className="mt-1 list-disc pl-5">
                {order.review.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <p className="mt-2">Appelez le client ou contrôlez le paiement, puis notez ce qui a été vérifié.</p>
              {canReopen(admin) ? (
                <Button size="sm" className="mt-3" onClick={() => setDialog('clearReview')}>
                  Valider après vérification
                </Button>
              ) : (
                <p className="mt-2 text-xs text-warning">Validation réservée aux membres autorisés.</p>
              )}
            </Notice>
          )}
          {order.review?.status === 'cleared' && (
            <p className="text-xs text-ink-muted">
              Commande vérifiée{order.review.by && ` par ${order.review.by}`}
              {order.review.at && ` le ${formatDateTime(order.review.at)}`}
              {order.review.note && ` : ${order.review.note}`} (signaux : {order.review.reasons.join(', ')})
            </p>
          )}
          {order.paymentStatus === 'partially_paid' && (
            <Notice title="Paiement partiel">
              Reçu {formatPrice(paidAmount(order))} sur {formatPrice(order.totals.total)} : il reste{' '}
              {formatPrice(remainingAmount(order))} à encaisser.
              <Button size="sm" className="mt-3" onClick={() => setDialog('payment')}>
                Enregistrer un complément
              </Button>
            </Notice>
          )}
          {toCollect && (
            <Notice title="Encaissement à confirmer">
              Paiement{' '}
              {order.paymentMethod === 'cash' ? 'en espèces' : 'par ' + paymentMethodLabel[order.paymentMethod]} à la
              livraison : confirmez l’encaissement de {formatPrice(checkoutPayment?.total ?? order.totals.total)}
              {checkoutPayment ? ` pour les ${checkoutPayment.orders} commandes centralisées` : ''}
              {order.paymentMethod !== 'cash' && ', avec la référence de la transaction reçue par SMS'}.
              <Button size="sm" className="mt-3" onClick={() => setDialog('payment')}>
                Confirmer l’encaissement
              </Button>
            </Notice>
          )}
          {overpayment(order) > 0 && (
            <Notice title="Trop-perçu à traiter">
              {formatPrice(overpayment(order))} reçus en plus du total : à rembourser ou à régulariser manuellement avec
              le client.
            </Notice>
          )}
          {order.paymentStatus === 'refund_due' && !returnReq?.status?.startsWith('refund') && (
            <Notice title="Remboursement à effectuer">
              Remboursez le client hors plateforme, puis confirmez avec la référence de l’opération.
              <Button size="sm" className="mt-3" onClick={() => setDialog('refund')}>
                Confirmer le remboursement
              </Button>
            </Notice>
          )}
          {invoices.some((d) => d.orderId === order.id) && (
            <section>
              <h3 className="mb-2 font-bold">Factures et avoirs</h3>
              <ul className="space-y-1">
                {invoices
                  .filter((d) => d.orderId === order.id)
                  .map((d) => (
                    <li key={d.id} className="flex justify-between gap-3">
                      <span>
                        <span className="font-mono font-semibold">{d.number}</span>{' '}
                        <span className="text-xs text-ink-muted">
                          {d.type === 'invoice' ? 'Facture' : `Avoir sur ${d.relatedNumber}`} ·{' '}
                          {formatDateTime(d.issuedAt)}
                        </span>
                      </span>
                      <span className="tabular-nums">
                        {d.type === 'credit_note' ? '-' : ''}
                        {formatPrice(d.totals.ttc)}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          )}
          {(order.payments?.length ?? 0) > 0 && (
            <section>
              <h3 className="mb-2 font-bold">Encaissements et remboursements</h3>
              <ul className="divide-y divide-sage">
                {order.payments!.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block font-medium">
                        {p.kind === 'payment' ? 'Paiement reçu' : 'Remboursement'} · {paymentMethodLabel[p.method]}
                      </span>
                      <span className="block text-xs text-ink-muted">
                        {formatDateTime(p.at)}
                        {p.reference && ` · réf. ${p.reference}`} · {p.by}
                        {p.note && ` · ${p.note}`}
                      </span>
                    </span>
                    <span
                      className={
                        p.kind === 'refund' ? 'font-semibold text-danger tabular-nums' : 'font-semibold tabular-nums'
                      }
                    >
                      {p.kind === 'refund' ? '-' : ''}
                      {formatPrice(p.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {order.fulfilledBy === 'okoume' && order.deliveryDispute && (
            <Notice title="Livraison contestée par le client">
              {order.deliveryDispute.status === 'resolved' ? (
                <>Réclamation close : {order.deliveryDispute.resolution}</>
              ) : (
                <>
                  Réclamation ouverte le {formatDateTime(order.deliveryDispute.createdAt)}. Le statut reste « Livrée »
                  pendant l’enquête.
                  <div className="mt-3">
                    <Button size="sm" onClick={() => setDialog('resolveDispute')}>
                      Clore la réclamation
                    </Button>
                  </div>
                </>
              )}
            </Notice>
          )}
          {cancelReq?.status === 'pending' && (
            <Notice title="Demande d’annulation du client">
              « {cancelReq.reason} » {cancelReq.comment && `: ${cancelReq.comment}`}
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  loading={update.isPending}
                  onClick={() =>
                    act(
                      () => adminOrdersBackend.decideCancellation(order, true, 'Acceptée', couriers),
                      'Annulation acceptée',
                    )
                  }
                >
                  Accepter
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDialog('refuseCancel')}>
                  Refuser
                </Button>
              </div>
            </Notice>
          )}
          {returnReq && (
            <Notice title={`Retour : ${returnStatusLabel[returnReq.status]}`}>
              « {returnReq.reason} » {returnReq.comment && `: ${returnReq.comment}`}
              {returnReq.decisionReason && <p className="mt-1 text-ink-muted">Décision : {returnReq.decisionReason}</p>}
              {returnReq.status === 'pending' && !canDecideReturn(admin) && (
                <p className="mt-2 text-xs text-warning">Décision réservée à l’administrateur principal.</p>
              )}
              {returnReq.status === 'pending' && canDecideReturn(admin) && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" loading={update.isPending} onClick={() => setDialog('acceptReturn')}>
                    Accepter le retour
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDialog('refuseReturn')}>
                    Refuser
                  </Button>
                </div>
              )}
              {returnStep && (
                <Button
                  size="sm"
                  className="mt-3"
                  loading={update.isPending}
                  onClick={() =>
                    returnStep.to === 'refunded'
                      ? setDialog('refund')
                      : act(
                          () => adminCommerceBackend.receiveReturn(returnReq!),
                          `${returnStep.label} : ${order.number}`,
                        )
                  }
                >
                  {returnStep.label}
                </Button>
              )}
              {returnReq.status === 'refund_due' && (
                <>
                  <Button size="sm" className="mt-3" onClick={() => setDialog('refund')}>
                    Confirmer le remboursement
                  </Button>
                </>
              )}
            </Notice>
          )}

          <Section title="Client et livraison">
            <p className="font-semibold">{order.customer.recipient}</p>
            <a
              href={`tel:${order.customer.phone.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-1.5 text-forest hover:underline"
            >
              <Phone className="size-3.5" aria-hidden="true" />
              {order.customer.phone}
            </a>
            <p className="text-ink-soft">
              {order.customer.zoneName} : {order.customer.landmark}
            </p>
            {order.customer.instructions && <p className="text-ink-soft">{order.customer.instructions}</p>}
            {order.courier && <p className="text-ink-soft">Livreur : {order.courier}</p>}
          </Section>

          <Section title="Frais de livraison">
            <dl className="grid grid-cols-2 gap-2">
              <div>
                <dt className="text-xs text-ink-muted">Facturés au client</dt>
                <dd className="font-semibold">
                  {formatPrice(order.totals.deliveryFee - order.totals.deliveryDiscount)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Coût réel de la course</dt>
                <dd className="font-semibold">
                  {order.deliveryCost !== undefined ? formatPrice(order.deliveryCost) : 'Non renseigné'}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => setDialog('deliveryCost')}>
                Modifier le coût réel
              </Button>
            </div>
          </Section>

          <Section title={`Articles (${order.items.reduce((s, i) => s + i.quantity, 0)})`}>
            <ul className="divide-y divide-sage">
              {order.items.map((i) => (
                <li key={i.variantId} className="flex items-center gap-3 py-2.5">
                  <img
                    src={i.image}
                    alt=""
                    className="size-11 shrink-0 rounded-md border border-sage bg-white object-contain p-0.5"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{i.name}</span>
                    <span className="block text-xs text-ink-muted">
                      {i.variantLabel} · {i.quantity} × {formatPrice(i.unitPrice)}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatPrice(i.unitPrice * i.quantity)}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Montants">
            <dl className="space-y-1.5">
              <Line label="Sous-total" value={formatPrice(order.totals.subtotal)} />
              {order.totals.codeDiscount > 0 && (
                <Line
                  label="Remises"
                  value={`−${formatPrice(order.totals.codeDiscount)}`}
                />
              )}
              <Line label="Livraison" value={formatPrice(order.totals.deliveryFee - order.totals.deliveryDiscount)} />
              <Line label="Total" value={formatPrice(order.totals.total)} strong />
              <Line label={`Paiement : ${paymentMethodLabel[order.paymentMethod]}`} value="" />
              <Line label="Marge brute" value={formatPrice(grossMargin(order))} />
            </dl>
          </Section>

          <Section title="Historique">
            <ol className="space-y-2.5 border-l-2 border-sage pl-4">
              {[...order.history].reverse().map((h, i) => (
                <li key={`${h.at}-${i}`}>
                  <p className="font-medium">
                    {h.from && h.from !== h.status
                      ? `${orderStatusLabel[h.from]} vers ${orderStatusLabel[h.status]}`
                      : orderStatusLabel[h.status]}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {formatDateTime(h.at)}
                    {h.by && ` · ${h.by}`}
                    {h.note && ` · ${h.note}`}
                  </p>
                </li>
              ))}
            </ol>
          </Section>
        </div>
      </Drawer>

      <ReasonDialog
        open={dialog === 'reopen'}
        onClose={() => setDialog(null)}
        title={`Rouvrir ${order.number}`}
        description="La commande repart « En cours de livraison » ; l’historique initial est conservé. Exemple : colis remis à la mauvaise personne."
        confirmLabel="Rouvrir"
        loading={update.isPending}
        onConfirm={(reason) => transition({ action: 'reopen', reason }, `${order.number} rouverte`)}
      />
      <ReasonDialog
        open={dialog === 'clearReview'}
        onClose={() => setDialog(null)}
        title={`Vérifier ${order.number}`}
        description="Indiquez ce qui a été contrôlé (appel du client, paiement reçu, adresse confirmée). La note est conservée avec la commande."
        confirmLabel="Valider la commande"
        loading={update.isPending}
        onConfirm={(note) =>
          act(() => adminOrdersBackend.clearReview(order, note, couriers), `${order.number} vérifiée`)
        }
      />
      <ReasonDialog
        open={dialog === 'cancel'}
        onClose={() => setDialog(null)}
        title={`Annuler ${order.number}`}
        description="Le client est prévenu et le stock réservé est libéré. Un paiement déjà reçu passe en remboursement à effectuer."
        confirmLabel="Annuler la commande"
        danger
        loading={update.isPending}
        onConfirm={(r) => transition({ action: 'cancel', reason: r }, `${order.number} annulée`)}
      />
      <ReasonDialog
        open={dialog === 'refuseCancel'}
        onClose={() => setDialog(null)}
        title="Refuser l’annulation"
        description="Le motif est communiqué au client."
        confirmLabel="Refuser"
        loading={update.isPending}
        onConfirm={(r) =>
          act(() => adminOrdersBackend.decideCancellation(order, false, r, couriers), 'Demande d’annulation refusée')
        }
      />
      <ReasonDialog
        open={dialog === 'resolveDispute'}
        onClose={() => setDialog(null)}
        title="Clore la réclamation"
        description="La conclusion de l’enquête est communiquée au client."
        label="Conclusion"
        confirmLabel="Clore"
        loading={update.isPending}
        onConfirm={(r) =>
          act(() => adminOrdersBackend.resolveDispute(order, r, couriers), `Réclamation de ${order.number} close`)
        }
      />
      <ReasonDialog
        open={dialog === 'refuseReturn'}
        onClose={() => setDialog(null)}
        title="Refuser le retour"
        description="Le motif est communiqué au client."
        confirmLabel="Refuser"
        loading={update.isPending}
        onConfirm={(r) => returnReq && act(() => adminCommerceBackend.refuseReturn(returnReq, r), 'Retour refusé')}
      />
      {dialog === 'acceptReturn' && returnReq && (
        <ReturnAcceptDialog
          orderNumber={order.number}
          loading={update.isPending}
          onClose={() => setDialog(null)}
          onConfirm={(acceptance) =>
            act(() => adminCommerceBackend.acceptReturn(returnReq, acceptance), `Retour de ${order.number} accepté`)
          }
        />
      )}
      {dialog === 'failure' && (
        <DeliveryFailureDialog
          orderNumber={order.number}
          loading={update.isPending}
          onClose={() => setDialog(null)}
          onConfirm={(reason, decision) =>
            transition(
              { action: 'delivery_failed', reason, decision },
              decision === 'cancel'
                ? `${order.number} annulée après échec de livraison (${reason})`
                : `Échec de livraison ${order.number} (${reason}) : nouvelle tentative`,
            )
          }
        />
      )}
      {dialog === 'deliveryCost' && (
        <AmountReasonDialog
          title="Coût réel de la course"
          description="Montant payé au livreur, distinct des frais facturés au client. Sert au calcul de la marge."
          amountLabel="Coût réel (FCFA)"
          initial={order.deliveryCost ?? zoneCost ?? 0}
          withReason={false}
          confirmLabel="Enregistrer"
          loading={update.isPending}
          onClose={() => setDialog(null)}
          onConfirm={(amount) =>
            act(
              () => adminOrdersBackend.setDeliveryCost(order, amount, couriers),
              `${order.number} : coût réel de livraison enregistré`,
            )
          }
        />
      )}
      {dialog === 'payment' && (
        <RecordPaymentDialog
          order={order}
          checkout={checkoutPayment}
          loading={update.isPending}
          onClose={() => setDialog(null)}
          onConfirm={recordPayment}
        />
      )}
      {dialog === 'refund' && (
        <RefundDialog
          order={order}
          loading={update.isPending}
          onClose={() => setDialog(null)}
          onConfirm={confirmRefund}
        />
      )}
      {dialog === 'courier' && (
        <AssignCourierDialog
          order={order}
          loading={update.isPending}
          onClose={() => setDialog(null)}
          onAssign={(c) =>
            transition(
              { action: 'assign_courier', courierId: c.id },
              `${order.number} confiée à ${c.firstName} ${c.lastName}`,
            )
          }
        />
      )}
    </>
  );
}

const returnStatusLabel: Record<NonNullable<AdminOrder['returnRequest']>['status'], string> = {
  pending: 'en attente de décision',
  accepted: 'accepté, colis attendu',
  refused: 'refusé',
  expected: 'colis attendu',
  received: 'colis reçu',
  refund_due: 'remboursement à effectuer',
  refunded: 'remboursé',
  closed: 'clôturé',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-bold">{title}</h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? 'flex justify-between font-bold' : 'flex justify-between text-ink-soft'}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-mure/30 bg-mure-50 p-4">
      <p className="mb-1 font-bold text-ink">{title}</p>
      <div className="text-ink-soft">{children}</div>
    </div>
  );
}
