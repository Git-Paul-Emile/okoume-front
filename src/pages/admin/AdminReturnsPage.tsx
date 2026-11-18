import { useState } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import { useAdminOrders } from '@/features/admin/admin.queries';
import type { AdminOrder } from '@/features/admin/admin.types';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { OrderDrawer } from '@/features/admin/components/OrderDrawer';
import { OrderStatusBadge, StateBadge } from '@/features/admin/components/StatusBadges';
import { PageIntro, Segmented, Toolbar } from '@/features/admin/components/Toolbar';
import { useSelection } from '@/features/admin/useSelection';
import { formatDateTime } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';

type Kind = 'cancel' | 'return';
type State = 'pending' | 'done';

const decision = (status: string) =>
  status === 'pending' ? (
    <StateBadge tone="warning">À décider</StateBadge>
  ) : status === 'refused' ? (
    <StateBadge tone="danger">Refusée</StateBadge>
  ) : status === 'refunded' || status === 'closed' ? (
    <StateBadge tone="neutral">Clôturée</StateBadge>
  ) : (
    <StateBadge tone="forest">Acceptée</StateBadge>
  );

const request = (o: AdminOrder, kind: Kind) => (kind === 'cancel' ? o.cancellationRequest : o.returnRequest);

export default function AdminReturnsPage() {
  const { data: orders, isLoading } = useAdminOrders();
  const [kind, setKind] = useState<Kind>('cancel');
  const [state, setState] = useState<State>('pending');
  const { selected, open, close } = useSelection(orders);

  if (isLoading || !orders) return <PageLoader />;

  // Seules les demandes passées par une décision de l'équipe : une annulation directe avant préparation n'en a pas
  const withRequest = (k: Kind) =>
    orders.filter((o) => {
      const r = request(o, k);
      return !!r && (k === 'return' || r.status === 'pending' || r.decisionReason !== undefined);
    });
  const isPending = (o: AdminOrder, k: Kind) => {
    const s = request(o, k)!.status;
    return s === 'pending' || (k === 'return' && (s === 'accepted' || s === 'received' || s === 'refund_due'));
  };
  const rows = withRequest(kind).filter((o) => isPending(o, kind) === (state === 'pending'));

  const columns: Column<AdminOrder>[] = [
    {
      key: 'number',
      header: 'Commande',
      cell: (o) => (
        <>
          <span className="block font-semibold">{o.number}</span>
          <span className="block text-xs text-ink-muted">Demande du {formatDateTime(request(o, kind)!.createdAt)}</span>
        </>
      ),
    },
    { key: 'customer', header: 'Client', cell: (o) => o.customer.recipient },
    {
      key: 'reason',
      header: 'Motif',
      cell: (o) => <span className="line-clamp-2 max-w-xs">{request(o, kind)!.reason}</span>,
    },
    {
      key: 'amount',
      header: 'Montant',
      align: 'right',
      cell: (o) => <span className="tabular-nums">{formatPrice(o.totals.total)}</span>,
    },
    { key: 'order', header: 'Commande', cell: (o) => <OrderStatusBadge status={o.status} /> },
    { key: 'decision', header: 'Décision', cell: (o) => decision(request(o, kind)!.status) },
  ];

  return (
    <>
      <PageIntro>
        Une annulation demandée après le début de la préparation et chaque retour (dans les 7 jours suivant la
        livraison) passent par une décision de l’équipe, communiquée au client avec son motif.
      </PageIntro>
      <Toolbar>
        <Segmented
          label="Type de demande"
          value={kind}
          onChange={setKind}
          options={[
            {
              value: 'cancel',
              label: 'Annulations',
              count: withRequest('cancel').filter((o) => isPending(o, 'cancel')).length,
            },
            {
              value: 'return',
              label: 'Retours',
              count: withRequest('return').filter((o) => isPending(o, 'return')).length,
            },
          ]}
        />
        <Segmented
          label="État"
          value={state}
          onChange={setState}
          options={[
            { value: 'pending', label: 'En cours' },
            { value: 'done', label: 'Traitées' },
          ]}
        />
      </Toolbar>
      <AdminTable
        key={kind + state}
        caption="Demandes d’annulation et de retour"
        columns={columns}
        rows={rows}
        rowKey={(o) => o.id}
        onRowClick={open}
        empty="Aucune demande dans cette catégorie."
      />
      <OrderDrawer order={selected} onClose={close} />
    </>
  );
}
