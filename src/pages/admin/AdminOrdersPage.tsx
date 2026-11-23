import { useState } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import type { OrderStatus } from '@/features/orders/orders.types';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { adminOrdersBackend } from '@/features/admin/adminOrders.backend';
import { useAdminMutation, useAdminOrders } from '@/features/admin/admin.queries';
import { bulkAdvancePlan, type BulkPlan } from '@/features/admin/orders.bulk';
import { orderStatusLabel } from '@/features/orders/orders.constants';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import type { AdminOrder } from '@/features/admin/admin.types';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { OrderDrawer } from '@/features/admin/components/OrderDrawer';
import { OrderStatusBadge, PaymentStatusBadge } from '@/features/admin/components/StatusBadges';
import { shortMethod } from '@/features/admin/admin.constants';
import { PageIntro, SearchInput, Segmented, Toolbar } from '@/features/admin/components/Toolbar';
import { matches } from '@/features/admin/admin.utils';
import { useSelection } from '@/features/admin/useSelection';
import { formatDateTime } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';

type Filter = 'all' | 'review' | 'todo' | 'preparing' | 'delivery' | 'delivered' | 'issues';

const FILTERS: Record<Filter, { label: string; statuses?: OrderStatus[] }> = {
  all: { label: 'Toutes' },
  // Commandes signalées par l'API (19.3), en attente de vérification avant la préparation
  review: { label: 'À vérifier' },
  todo: { label: 'À préparer', statuses: ['confirmed'] },
  preparing: { label: 'En préparation', statuses: ['preparing', 'ready'] },
  delivery: { label: 'En livraison', statuses: ['courier_assigned', 'shipping'] },
  delivered: { label: 'Livrées', statuses: ['delivered'] },
  issues: { label: 'Annulées et réclamations', statuses: ['cancelled', 'claim'] },
};

const requestNote = (o: AdminOrder) =>
  [
    o.cancellationRequest?.status === 'pending' && 'Annulation demandée',
    o.returnRequest &&
      ['pending', 'accepted', 'received', 'refund_due'].includes(o.returnRequest.status) &&
      'Retour en cours',
    o.fulfilledBy === 'okoume' && o.deliveryDispute && 'Livraison contestée',
  ].filter(Boolean) as string[];

const deliveryLabel = (o: AdminOrder) =>
  o.status === 'delivered'
    ? 'Livrée'
    : o.status === 'shipping'
      ? 'En cours de livraison'
      : o.status === 'courier_assigned'
        ? 'Livreur trouvé'
        : o.status === 'ready'
          ? 'Livreur à assigner'
          : o.status === 'cancelled'
            ? '-'
            : 'Pas encore';

const columns = (picked: Set<string>, toggle: (id: string) => void): Column<AdminOrder>[] => [
  {
    key: 'pick',
    header: 'Sélection',
    cell: (o) => (
      <input
        type="checkbox"
        className="size-4 accent-forest"
        aria-label={`Sélectionner ${o.number}`}
        checked={picked.has(o.id)}
        onClick={(e) => e.stopPropagation()}
        onChange={() => toggle(o.id)}
      />
    ),
  },
  {
    key: 'number',
    header: 'Commande',
    cell: (o) => (
      <>
        <span className="block font-semibold text-ink">{o.number}</span>
        <span className="block text-xs text-ink-muted">{formatDateTime(o.createdAt)}</span>
        {requestNote(o).map((n) => (
          <span key={n} className="block text-xs font-semibold text-warning">
            {n}
          </span>
        ))}
      </>
    ),
  },
  {
    key: 'customer',
    header: 'Client',
    cell: (o) => (
      <>
        <span className="block font-medium">{o.customer.recipient}</span>
        <span className="block text-xs text-ink-muted">{o.customer.zoneName}</span>
      </>
    ),
  },
  {
    key: 'items',
    header: 'Produits',
    cell: (o) => (
      <span className="line-clamp-2 block max-w-[220px] text-sm">
        {o.items.map((i) => `${i.quantity} × ${i.name}`).join(', ')}
      </span>
    ),
  },
  {
    key: 'total',
    header: 'Total',
    align: 'right',
    cell: (o) => <span className="font-semibold tabular-nums">{formatPrice(o.totals.total)}</span>,
  },
  {
    key: 'payment',
    header: 'Paiement',
    cell: (o) => (
      <>
        <span className="mb-1 block text-xs text-ink-muted">{shortMethod[o.paymentMethod]}</span>
        <PaymentStatusBadge status={o.paymentStatus} />
      </>
    ),
  },
  { key: 'status', header: 'Préparation', cell: (o) => <OrderStatusBadge status={o.status} /> },
  {
    key: 'delivery',
    header: 'Livraison',
    cell: (o) => (
      <>
        <span className="block text-sm">{deliveryLabel(o)}</span>
        {o.courier && <span className="block text-xs text-ink-muted">{o.courier}</span>}
      </>
    ),
  },
];

export default function AdminOrdersPage() {
  const { data: orders, isLoading } = useAdminOrders();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const { selected, open, close } = useSelection(orders);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const admin = useAdminAuthStore((s) => s.admin);
  const by = admin ? `${admin.firstName} ${admin.lastName}` : 'Équipe';
  const bulk = useAdminMutation(
    async (plan: BulkPlan) => {
      // Chaque passage est une transition, avec ses effets (stock, points) appliqués par le serveur
      for (const { order } of plan.ready) await adminOrdersBackend.transition(order, { action: 'advance' }, []);
    },
    (plan) =>
      `Changement groupé : ${plan.ready.length} commande(s) avancée(s)${plan.skipped.length ? `, ${plan.skipped.length} laissée(s) de côté` : ''}`,
  );

  if (isLoading || !orders) return <PageLoader />;

  const inFilter = (o: AdminOrder, f: Filter) =>
    f === 'review'
      ? o.status !== 'cancelled' && o.review?.status === 'pending'
      : !FILTERS[f].statuses || FILTERS[f].statuses!.includes(o.status);
  const toggle = (id: string) =>
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const plan = bulkAdvancePlan(
    orders.filter((o) => picked.has(o.id)),
    by,
  );
  const rows = orders.filter(
    (o) => inFilter(o, filter) && matches(query, o.number, o.customer.recipient, o.customer.phone, o.customer.zoneName),
  );

  return (
    <>
      <PageIntro>
        Suivez chaque commande de la confirmation à la livraison. Cliquez sur une ligne pour la traiter.
      </PageIntro>
      <Toolbar>
        <Segmented
          label="Statut"
          value={filter}
          onChange={setFilter}
          options={(Object.keys(FILTERS) as Filter[]).map((f) => ({
            value: f,
            label: FILTERS[f].label,
            count: orders.filter((o) => inFilter(o, f)).length,
          }))}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Numéro, client, téléphone" />
      </Toolbar>
      {picked.size > 0 && (
        <div
          className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-sage bg-white px-4 py-3 text-sm"
          role="region"
          aria-label="Actions groupées"
        >
          <span className="font-semibold">{picked.size} commande(s) sélectionnée(s)</span>
          <Button size="sm" disabled={!plan.ready.length} onClick={() => setConfirming(true)}>
            Passer à l’étape suivante
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPicked(new Set())}>
            Tout désélectionner
          </Button>
          {plan.skipped.length > 0 && (
            <span className="text-xs text-ink-muted">
              {plan.skipped.length} ne peu{plan.skipped.length > 1 ? 'vent' : 't'} pas avancer :{' '}
              {plan.skipped.map((x) => `${x.number} (${x.reason})`).join(' ; ')}
            </span>
          )}
        </div>
      )}
      <AdminTable
        key={filter + query}
        caption="Commandes"
        columns={columns(picked, toggle)}
        rows={rows}
        rowKey={(o) => o.id}
        onRowClick={open}
        empty="Aucune commande ne correspond."
      />
      <OrderDrawer order={selected} onClose={close} />
      <ConfirmDialog
        open={confirming}
        title={`Faire avancer ${plan.ready.length} commande(s) ?`}
        description={`${plan.ready.map((r) => `${r.order.number} : ${orderStatusLabel[r.patch.status!]}`).join(', ')}.${plan.skipped.length ? ` ${plan.skipped.length} commande(s) restent inchangées.` : ''} Chaque étape est enregistrée avec votre nom.`}
        confirmLabel="Confirmer"
        loading={bulk.isPending}
        onClose={() => setConfirming(false)}
        onConfirm={() =>
          bulk.mutate(plan, {
            onSuccess: () => {
              setConfirming(false);
              setPicked(new Set());
            },
          })
        }
      />
    </>
  );
}
