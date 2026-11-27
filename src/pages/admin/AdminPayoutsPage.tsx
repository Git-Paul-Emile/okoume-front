import { useQuery } from '@tanstack/react-query';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { StateBadge } from '@/features/admin/components/StatusBadges';
import { PageIntro, Segmented, Toolbar } from '@/features/admin/components/Toolbar';
import { adminPayoutsBackend, type AdminPayout } from '@/features/admin/adminPayouts.backend';
import { formatDate } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';
import { useState } from 'react';

type Filter = 'pending' | 'paid';
const METHOD = { cash: 'Espèces', airtel: 'Airtel Money', moov: 'Moov Money' } as const;

/** Consultation de l'historique des reversements vendeurs. */
export default function AdminPayoutsPage() {
  const [filter, setFilter] = useState<Filter>('pending');
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'payouts', filter],
    queryFn: ({ signal }) => adminPayoutsBackend.list(filter, signal),
  });

  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const columns: Column<AdminPayout>[] = [
    { key: 'shop', header: 'Boutique', cell: (payout) => <span className="font-semibold">{payout.shop.name}</span> },
    { key: 'order', header: 'Commande', cell: (payout) => <span className="font-mono">{payout.order.number}</span> },
    { key: 'collected', header: 'Encaissé', align: 'right', cell: (payout) => formatPrice(payout.collected) },
    {
      key: 'retained',
      header: 'Retenu',
      align: 'right',
      cell: (payout) => (
        <span className="text-ink-soft">
          {formatPrice(payout.deliveryFee + payout.commission)}
          <span className="block text-xs">
            livraison {formatPrice(payout.deliveryFee)}, commission {payout.commissionRate} %
          </span>
        </span>
      ),
    },
    { key: 'amount', header: 'Montant vendeur', align: 'right', cell: (payout) => <b>{formatPrice(payout.amount)}</b> },
    {
      key: 'status',
      header: 'État',
      cell: (payout) =>
        payout.status === 'paid' ? (
          <StateBadge tone="forest">
            {`Reversé${payout.paidAt ? ` le ${formatDate(payout.paidAt)}` : ''}${payout.method ? ` (${METHOD[payout.method]})` : ''}`}
          </StateBadge>
        ) : (
          <StateBadge tone="warning">{`Dû depuis le ${formatDate(payout.createdAt)}`}</StateBadge>
        ),
    },
  ];

  return (
    <>
      <PageIntro>
        Consultez les reversements dus aux vendeurs et leur historique. Total actuellement dû : {formatPrice(data.due)}.
      </PageIntro>
      <Toolbar>
        <Segmented
          label="État"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'pending', label: 'À consulter' },
            { value: 'paid', label: 'Reversés' },
          ]}
        />
      </Toolbar>
      <AdminTable
        caption="Reversements aux vendeurs"
        columns={columns}
        rows={data.items}
        rowKey={(payout) => payout.id}
        empty={filter === 'pending' ? 'Aucun reversement dû.' : 'Aucun reversement enregistré.'}
      />
    </>
  );
}
