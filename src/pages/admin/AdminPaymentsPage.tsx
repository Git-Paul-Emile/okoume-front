import { useState } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import type { PaymentStatus } from '@/features/orders/orders.types';
import { useAdminOrders } from '@/features/admin/admin.queries';
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

/** Tous les paiements se font à la livraison : « À encaisser » regroupe les commandes livrées non encore réglées. */
type Filter = 'to_collect' | 'awaiting_payment' | 'paid';
const LABELS: Record<Filter, string> = {
  to_collect: 'Attendus (livrées)',
  awaiting_payment: 'Attendus (avant livraison)',
  paid: 'Payés',
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
  const [filter, setFilter] = useState<Filter>('to_collect');
  const [query, setQuery] = useState('');
  const { selected, open, close } = useSelection(orders);

  if (isLoading || !orders) return <PageLoader />;

  const by = (s: PaymentStatus) => orders.filter((o) => o.paymentStatus === s);
  const pending = by('awaiting_payment');
  const toCollect = pending.filter((o) => o.status === 'delivered');
  const beforeDelivery = pending.filter((o) => o.status !== 'delivered');
  const listOf = (f: Filter) => (f === 'to_collect' ? toCollect : f === 'awaiting_payment' ? beforeDelivery : by(f));
  const list = listOf(filter);
  const rows = list.filter((o) => matches(query, o.number, o.customer.recipient, o.customer.phone));

  return (
    <>
      <PageIntro>
        Consultez le statut et le montant des paiements par commande. Les paiements se font à la livraison.
      </PageIntro>
      <StatRow
        items={[
          { label: 'Attendus sur commandes livrées', value: formatPrice(sum(toCollect)) },
          { label: 'Attendus après livraison', value: formatPrice(sum(beforeDelivery)) },
          { label: 'Paiements enregistrés', value: formatPrice(sum(by('paid'))) },
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
            count: listOf(f).length,
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
    </>
  );
}
