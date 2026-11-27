import { useState } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import type { OrderStatus } from '@/features/orders/orders.types';
import { shortMethod } from '@/features/admin/admin.constants';
import type { AdminOrder } from '@/features/admin/admin.types';
import { useAdminOrders } from '@/features/admin/admin.queries';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { OrderDrawer } from '@/features/admin/components/OrderDrawer';
import { OrderStatusBadge, PaymentStatusBadge } from '@/features/admin/components/StatusBadges';
import { PageIntro, SearchInput, Segmented, Toolbar } from '@/features/admin/components/Toolbar';
import { useSelection } from '@/features/admin/useSelection';
import { formatDateTime } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';

type Filter = 'all' | 'todo' | 'preparing' | 'delivery' | 'delivered';
const filters: Record<Filter, { label: string; statuses?: OrderStatus[] }> = {
  all: { label: 'Toutes' },
  todo: { label: 'À préparer', statuses: ['confirmed'] },
  preparing: { label: 'En préparation', statuses: ['preparing', 'ready'] },
  delivery: { label: 'En livraison', statuses: ['courier_assigned', 'shipping'] },
  delivered: { label: 'Livrées', statuses: ['delivered'] },
};

const columns: Column<AdminOrder>[] = [
  { key: 'number', header: 'Commande', cell: (order) => <><span className="block font-semibold">{order.number}</span><span className="text-xs text-ink-muted">{formatDateTime(order.createdAt)}</span></> },
  { key: 'customer', header: 'Client', cell: (order) => <><span className="block font-medium">{order.customer.recipient}</span><span className="text-xs text-ink-muted">{order.customer.zoneName}</span></> },
  { key: 'items', header: 'Produits', cell: (order) => <span className="line-clamp-2 block max-w-[220px] text-sm">{order.items.map((item) => `${item.quantity} × ${item.name}`).join(', ')}</span> },
  { key: 'total', header: 'Total', align: 'right', cell: (order) => <span className="font-semibold tabular-nums">{formatPrice(order.totals.total)}</span> },
  { key: 'payment', header: 'Paiement', cell: (order) => <><span className="mb-1 block text-xs text-ink-muted">{shortMethod[order.paymentMethod]}</span><PaymentStatusBadge status={order.paymentStatus} /></> },
  { key: 'status', header: 'Préparation', cell: (order) => <OrderStatusBadge status={order.status} /> },
  { key: 'courier', header: 'Livreur', cell: (order) => order.courier ?? 'À assigner' },
];

export default function AdminOrdersPage() {
  const { data: orders, isLoading } = useAdminOrders();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const { selected, open, close } = useSelection(orders);
  if (isLoading || !orders) return <PageLoader />;

  const inFilter = (order: AdminOrder, key: Filter) => !filters[key].statuses || filters[key].statuses!.includes(order.status);
  const rows = orders.filter((order) =>
    inFilter(order, filter) && `${order.number} ${order.customer.recipient} ${order.customer.phone} ${order.customer.zoneName}`
      .toLocaleLowerCase('fr').includes(query.trim().toLocaleLowerCase('fr')),
  );

  return (
    <>
      <PageIntro>Suivez chaque commande, de sa confirmation à la livraison.</PageIntro>
      <Toolbar>
        <Segmented label="Statut" value={filter} onChange={setFilter} options={(Object.keys(filters) as Filter[]).map((key) => ({ value: key, label: filters[key].label, count: orders.filter((order) => inFilter(order, key)).length }))} />
        <SearchInput value={query} onChange={setQuery} placeholder="Numéro, client, téléphone" />
      </Toolbar>
      <AdminTable caption="Commandes" columns={columns} rows={rows} rowKey={(order) => order.id} onRowClick={open} empty="Aucune commande ne correspond." />
      <OrderDrawer order={selected} onClose={close} />
    </>
  );
}
