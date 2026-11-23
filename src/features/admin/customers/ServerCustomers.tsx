import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Drawer } from '@/components/ui/Drawer';
import { formatDate, formatDateTime } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';
import { matches } from '../admin.utils';
import { adminCustomersBackend, type CustomerSummary } from '../adminCustomers.backend';
import { AdminTable, type Column } from '../components/AdminTable';
import { OrderStatusBadge } from '../components/StatusBadges';
import { PageIntro, SearchInput, Segmented, StatRow, Toolbar } from '../components/Toolbar';

type Filter = 'all' | 'repeat';
const inFilter = (customer: CustomerSummary, filter: Filter) => filter === 'all' || customer.orderCount >= 2;

/** Fichier clients simplifié : commandes et coordonnées nécessaires au service. */
export function ServerCustomers() {
  const { data: customers, isLoading } = useQuery({
    queryKey: ['admin', 'customers'],
    queryFn: ({ signal }) => adminCustomersBackend.list(signal),
  });
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CustomerSummary | null>(null);

  if (isLoading || !customers) return <PageLoader />;

  const rows = customers
    .filter((customer) => inFilter(customer, filter) && matches(query, `${customer.firstName} ${customer.lastName}`, customer.email, customer.phone ?? ''))
    .sort((a, b) => b.totalSpent - a.totalSpent);
  const buyers = customers.filter((customer) => customer.orderCount > 0);
  const columns: Column<CustomerSummary>[] = [
    {
      key: 'name',
      header: 'Client',
      cell: (customer) => (
        <span className="min-w-0">
          <span className="block font-semibold">{customer.firstName} {customer.lastName}</span>
          <span className="block truncate text-xs text-ink-muted">{customer.email}</span>
        </span>
      ),
    },
    { key: 'phone', header: 'Téléphone', cell: (customer) => <span className="whitespace-nowrap">{customer.phone ?? ''}</span> },
    { key: 'orders', header: 'Commandes', align: 'right', cell: (customer) => customer.orderCount },
    { key: 'spent', header: 'Total dépensé', align: 'right', cell: (customer) => <span className="font-semibold tabular-nums">{formatPrice(customer.totalSpent)}</span> },
    { key: 'since', header: 'Inscrit le', cell: (customer) => formatDate(customer.createdAt) },
  ];

  return (
    <>
      <PageIntro>Les données personnelles ne servent qu’au traitement des commandes. Les coordonnées restent masquées sans le droit d’accès aux données sensibles.</PageIntro>
      <StatRow items={[
        { label: 'Comptes clients', value: customers.length },
        { label: 'Ont déjà commandé', value: buyers.length },
        { label: 'Clients récurrents', value: buyers.filter((customer) => customer.orderCount >= 2).length },
      ]} />
      <Toolbar>
        <Segmented label="Segment" value={filter} onChange={setFilter} options={[
          { value: 'all', label: 'Tous', count: customers.length },
          { value: 'repeat', label: 'Clients récurrents', count: customers.filter((customer) => customer.orderCount >= 2).length },
        ]} />
        <SearchInput value={query} onChange={setQuery} placeholder="Nom, e-mail, téléphone" />
      </Toolbar>
      <AdminTable caption="Clients" columns={columns} rows={rows} rowKey={(customer) => customer.id} onRowClick={setSelected} empty="Aucun client ne correspond." />
      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.firstName} ${selected.lastName}` : ''}>
        {selected && <CustomerDetailPanel id={selected.id} />}
      </Drawer>
    </>
  );
}

function CustomerDetailPanel({ id }: { id: string }) {
  const { data: customer, isLoading } = useQuery({
    queryKey: ['admin', 'customer', id],
    queryFn: ({ signal }) => adminCustomersBackend.detail(id, signal),
  });
  if (isLoading || !customer) return <PageLoader />;
  return (
    <div className="space-y-6 p-5 text-sm">
      <dl className="grid grid-cols-2 gap-3">
        <Info label="E-mail" value={customer.email} />
        <Info label="Téléphone" value={customer.phone ?? ''} />
        <Info label="Total dépensé" value={formatPrice(customer.totalSpent)} />
      </dl>
      {customer.addresses.length > 0 && <section>
        <h3 className="mb-2 font-bold">Adresses</h3>
        <ul className="space-y-2">{customer.addresses.map((address) => (
          <li key={address.id} className="text-ink-soft"><span className="font-medium text-ink">{address.label}</span> ({address.zoneName}) : {address.landmark}</li>
        ))}</ul>
      </section>}
      <section>
        <h3 className="mb-2 font-bold">Commandes ({customer.orders.length})</h3>
        <ul className="divide-y divide-sage">{customer.orders.slice(0, 10).map((order) => (
          <li key={order.id} className="flex items-center justify-between gap-3 py-2">
            <span><span className="block font-mono font-semibold">{order.number}</span><span className="text-xs text-ink-muted">{formatDateTime(order.createdAt)}</span></span>
            <span className="flex flex-col items-end gap-1"><span className="font-semibold tabular-nums">{formatPrice(order.total)}</span><OrderStatusBadge status={order.status} /></span>
          </li>
        ))}</ul>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs text-ink-muted">{label}</dt><dd className="truncate font-medium">{value}</dd></div>;
}
