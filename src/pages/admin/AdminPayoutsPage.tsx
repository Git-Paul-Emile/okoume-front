import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SelectField, TextField } from '@/components/ui/TextField';
import { useAdminMutation } from '@/features/admin/admin.queries';
import { adminPayoutsBackend, type AdminPayout } from '@/features/admin/adminPayouts.backend';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { StateBadge } from '@/features/admin/components/StatusBadges';
import { PageIntro, Segmented, Toolbar } from '@/features/admin/components/Toolbar';
import { formatDate } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';

type Filter = 'pending' | 'paid';
const METHOD = { cash: 'Espèces', airtel: 'Airtel Money', moov: 'Moov Money' } as const;

/**
 * Reversements aux vendeurs (cahier des charges 32.6) : à chaque encaissement d'une commande de vendeur livrée par
 * OKOZA, la part du vendeur est due. L'équipe la reverse et enregistre le moyen et la référence.
 */
export default function AdminPayoutsPage() {
  const [filter, setFilter] = useState<Filter>('pending');
  const [selected, setSelected] = useState<AdminPayout | null>(null);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'payouts', filter],
    queryFn: ({ signal }) => adminPayoutsBackend.list(filter, signal),
  });

  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const columns: Column<AdminPayout>[] = [
    { key: 'shop', header: 'Boutique', cell: (p) => <span className="font-semibold">{p.shop.name}</span> },
    { key: 'order', header: 'Commande', cell: (p) => <span className="font-mono">{p.order.number}</span> },
    { key: 'collected', header: 'Encaissé', align: 'right', cell: (p) => formatPrice(p.collected) },
    {
      key: 'retained',
      header: 'Retenu',
      align: 'right',
      cell: (p) => (
        <span className="text-ink-soft">
          {formatPrice(p.deliveryFee + p.commission)}
          <span className="block text-xs">
            livraison {formatPrice(p.deliveryFee)}, commission {p.commissionRate} %
          </span>
        </span>
      ),
    },
    { key: 'amount', header: 'À reverser', align: 'right', cell: (p) => <b>{formatPrice(p.amount)}</b> },
    {
      key: 'status',
      header: 'État',
      cell: (p) =>
        p.status === 'paid' ? (
          <StateBadge tone="forest">
            {`Reversé${p.paidAt ? ` le ${formatDate(p.paidAt)}` : ''}${p.method ? ` (${METHOD[p.method]})` : ''}`}
          </StateBadge>
        ) : (
          <StateBadge tone="warning">{`Dû depuis le ${formatDate(p.createdAt)}`}</StateBadge>
        ),
    },
  ];

  return (
    <>
      <PageIntro>
        OKOZA doit {formatPrice(data.due)} aux vendeurs pour des commandes encaissées par ses livreurs. Les commandes
        livrées par les vendeurs eux-mêmes sont encaissées par eux et n’apparaissent pas ici.
      </PageIntro>
      <Toolbar>
        <Segmented
          label="État"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'pending', label: 'À reverser' },
            { value: 'paid', label: 'Reversés' },
          ]}
        />
      </Toolbar>
      <AdminTable
        caption="Reversements aux vendeurs"
        columns={columns}
        rows={data.items}
        rowKey={(p) => p.id}
        onRowClick={(p) => p.status === 'pending' && setSelected(p)}
        empty={filter === 'pending' ? 'Aucun reversement à faire.' : 'Aucun reversement enregistré.'}
      />
      {selected && <PayDialog payout={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function PayDialog({ payout, onClose }: { payout: AdminPayout; onClose: () => void }) {
  const [method, setMethod] = useState<'cash' | 'airtel' | 'moov'>('airtel');
  const [reference, setReference] = useState('');
  const pay = useAdminMutation(
    () => adminPayoutsBackend.markPaid(payout.id, method, reference.trim() || null),
    `Reversement de ${formatPrice(payout.amount)} enregistré`,
  );
  const missingReference = method !== 'cash' && reference.trim().length < 3;
  return (
    <Modal
      open
      onClose={onClose}
      title={`Reverser ${formatPrice(payout.amount)}`}
      description={`${payout.shop.name}, commande ${payout.order.number}`}
    >
      <div className="space-y-4">
        <SelectField
          label="Moyen du reversement"
          value={method}
          onChange={(e) =>
            setMethod(e.target.value === 'cash' ? 'cash' : e.target.value === 'moov' ? 'moov' : 'airtel')
          }
        >
          <option value="airtel">Airtel Money</option>
          <option value="moov">Moov Money</option>
          <option value="cash">Espèces</option>
        </SelectField>
        {method !== 'cash' && (
          <TextField
            label="Référence de la transaction"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        )}
        <Button
          loading={pay.isPending}
          disabled={missingReference}
          onClick={() => pay.mutate(undefined, { onSuccess: onClose })}
        >
          Enregistrer le reversement
        </Button>
      </div>
    </Modal>
  );
}
