import { useState } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import type { PaymentStatus } from '@/features/orders/orders.types';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { adminOrdersBackend } from '@/features/admin/adminOrders.backend';
import { useAdminMutation, useAdminOrders, useAdminSettings } from '@/features/admin/admin.queries';
import { expiredPayments } from '@/features/admin/orders.actions';
import { can } from '@/features/admin/permissions';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import type { AdminOrder } from '@/features/admin/admin.types';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { OrderDrawer } from '@/features/admin/components/OrderDrawer';
import { OrderStatusBadge, PaymentStatusBadge } from '@/features/admin/components/StatusBadges';
import { shortMethod } from '@/features/admin/admin.constants';
import { PageIntro, SearchInput, Segmented, StatRow, Toolbar } from '@/features/admin/components/Toolbar';
import { matches } from '@/features/admin/admin.utils';
import { useSelection } from '@/features/admin/useSelection';
import { formatDateTime } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';

type Filter = 'awaiting_verification' | 'partially_paid' | 'refund_due' | 'awaiting_payment' | 'paid' | 'refunded';
const LABELS: Record<Filter, string> = {
  awaiting_verification: 'À vérifier',
  partially_paid: 'Partiels',
  refund_due: 'À rembourser',
  awaiting_payment: 'En attente',
  paid: 'Payés',
  refunded: 'Remboursés',
};

const columns: Column<AdminOrder>[] = [
  {
    key: 'number',
    header: 'Commande',
    cell: (o) => (
      <>
        <span className="block font-semibold">{o.number}</span>
        <span className="block text-xs text-ink-muted">{formatDateTime(o.createdAt)}</span>
      </>
    ),
  },
  { key: 'customer', header: 'Client', cell: (o) => o.customer.recipient },
  { key: 'method', header: 'Moyen', cell: (o) => shortMethod[o.paymentMethod] },
  {
    key: 'amount',
    header: 'Montant',
    align: 'right',
    cell: (o) => <span className="font-semibold tabular-nums">{formatPrice(o.totals.total)}</span>,
  },
  { key: 'payment', header: 'Paiement', cell: (o) => <PaymentStatusBadge status={o.paymentStatus} /> },
  { key: 'status', header: 'Commande', cell: (o) => <OrderStatusBadge status={o.status} /> },
];

const sum = (list: AdminOrder[]) => list.reduce((s, o) => s + o.totals.total, 0);

export default function AdminPaymentsPage() {
  const { data: orders, isLoading } = useAdminOrders();
  const { data: settings } = useAdminSettings();
  const admin = useAdminAuthStore((s) => s.admin);
  const [now] = useState(() => Date.now());
  const [confirmExpired, setConfirmExpired] = useState(false);
  const [filter, setFilter] = useState<Filter>('awaiting_verification');
  const cancelExpired = useAdminMutation(
    async (list: AdminOrder[]) => {
      // Annulation par transition ; la réservation est libérée par le serveur
      for (const o of list)
        await adminOrdersBackend.transition(
          o,
          { action: 'cancel', reason: 'paiement Mobile Money non reçu dans le délai' },
          [],
        );
    },
    (list) => `${list.length} commande${list.length > 1 ? 's annulées' : ' annulée'} : paiement non reçu dans le délai`,
  );
  const [query, setQuery] = useState('');
  const { selected, open, close } = useSelection(orders);

  if (isLoading || !orders) return <PageLoader />;

  const by = (s: PaymentStatus) => orders.filter((o) => o.paymentStatus === s);
  // Une commande annulée sans paiement n'attend plus rien
  const pending = by('awaiting_payment').filter((o) => o.status !== 'cancelled');
  const list = filter === 'awaiting_payment' ? pending : by(filter);
  const rows = list.filter((o) => matches(query, o.number, o.customer.recipient, o.customer.phone));
  const hours = settings?.mobileMoneyExpiryHours ?? 24;
  const expired = expiredPayments(orders, hours, now);

  return (
    <>
      <PageIntro>
        Les paiements Airtel Money et Moov Money sont vérifiés à la main : comparez le montant et la référence reçus
        avant de confirmer.
      </PageIntro>
      {expired.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-[#fbf1dc] p-4 text-sm">
          <p className="text-warning">
            <strong>
              {expired.length} commande{expired.length > 1 ? 's' : ''} Mobile Money
            </strong>{' '}
            sans paiement depuis plus de {hours} h : {expired.map((o) => o.number).join(', ')}. Le client est informé de
            l’annulation et le stock réservé est libéré.
          </p>
          {can(admin, 'paiements:annuler') && (
            <Button size="sm" variant="danger" onClick={() => setConfirmExpired(true)}>
              Annuler les commandes expirées
            </Button>
          )}
        </div>
      )}
      <StatRow
        items={[
          { label: 'À vérifier', value: formatPrice(sum(by('awaiting_verification'))) },
          { label: 'À rembourser', value: formatPrice(sum(by('refund_due'))) },
          { label: 'Espèces à encaisser', value: formatPrice(sum(pending.filter((o) => o.paymentMethod === 'cash'))) },
          { label: 'Encaissé au total', value: formatPrice(sum(by('paid'))) },
        ]}
      />
      <Toolbar>
        <Segmented
          label="Statut du paiement"
          value={filter}
          onChange={setFilter}
          options={(Object.keys(LABELS) as Filter[]).map((f) => ({
            value: f,
            label: LABELS[f],
            count: f === 'awaiting_payment' ? pending.length : by(f).length,
          }))}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Numéro, client, téléphone" />
      </Toolbar>
      <AdminTable
        key={filter + query}
        caption="Paiements"
        columns={columns}
        rows={rows}
        rowKey={(o) => o.id}
        onRowClick={open}
        empty="Rien dans cette catégorie."
      />
      <OrderDrawer order={selected} onClose={close} />
      <ConfirmDialog
        open={confirmExpired}
        title="Annuler les commandes expirées"
        description={`${expired.length} commande${expired.length > 1 ? 's' : ''} sans paiement reçu après ${hours} h. Si un paiement arrive ensuite, il sera remboursé après vérification.`}
        confirmLabel="Annuler les commandes"
        tone="danger"
        loading={cancelExpired.isPending}
        onConfirm={() => cancelExpired.mutate(expired, { onSuccess: () => setConfirmExpired(false) })}
        onClose={() => setConfirmExpired(false)}
      />
    </>
  );
}
