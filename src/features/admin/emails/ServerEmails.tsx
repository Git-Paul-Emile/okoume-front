import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { formatDateTime } from '@/utils/formatDate';
import { matches } from '../admin.utils';
import { useAdminMutation } from '../admin.queries';
import { AdminTable, type Column } from '../components/AdminTable';
import { StateBadge } from '../components/StatusBadges';
import { PageIntro, SearchInput, Segmented, StatRow, Toolbar } from '../components/Toolbar';
import { can } from '../permissions';
import { emailDeliveriesBackend, type Delivery } from '../emailDeliveries.backend';

/** Suivi des e-mails sur l'API : le texte n'est jamais montré. */

type Filter = 'all' | 'failed' | 'sending' | 'sent';
const labels: Record<Filter, string> = { all: 'Tous', failed: 'En échec', sending: 'En cours', sent: 'Envoyés' };
const statusBadge: Record<Delivery['status'], { tone: 'forest' | 'warning' | 'danger' | 'neutral'; label: string }> = {
  sent: { tone: 'forest', label: 'Envoyé' },
  sending: { tone: 'warning', label: 'En cours' },
  failed: { tone: 'danger', label: 'En échec' },
  retried: { tone: 'neutral', label: 'Relancé' },
};

export function ServerEmails() {
  const admin = useAdminAuthStore((s) => s.admin);
  const { data: deliveries, isLoading } = useQuery({
    queryKey: ['admin', 'emailDeliveries'],
    queryFn: ({ signal }) => emailDeliveriesBackend.list(signal),
  });
  const [filter, setFilter] = useState<Filter>('failed');
  const [query, setQuery] = useState('');
  const retry = useAdminMutation(
    (d: Delivery) => emailDeliveriesBackend.retry(d.id),
    (d) => `E-mail relancé : ${d.subject}`,
  );

  if (isLoading || !deliveries) return <PageLoader />;
  const inFilter = (d: Delivery, f: Filter) => f === 'all' || d.status === f;
  const rows = deliveries.filter((d) => inFilter(d, filter) && matches(query, d.to, d.subject));
  const canRetry = can(admin, 'commandes:modifier');

  const columns: Column<Delivery>[] = [
    {
      key: 'at',
      header: 'Date',
      cell: (d) => <span className="whitespace-nowrap">{formatDateTime(d.createdAt)}</span>,
    },
    {
      key: 'mail',
      header: 'E-mail',
      cell: (d) => (
        <>
          <span className="block font-semibold">{d.subject}</span>
          <span className="block text-xs text-ink-muted">{d.to}</span>
        </>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      cell: (d) => (
        <>
          <StateBadge tone={statusBadge[d.status].tone}>{statusBadge[d.status].label}</StateBadge>
          {d.lastError && d.status !== 'sent' && (
            <span className="mt-1 block max-w-xs text-xs text-ink-muted">{d.lastError}</span>
          )}
        </>
      ),
    },
    { key: 'attempts', header: 'Essais', align: 'right', cell: (d) => d.attempts },
    {
      key: 'action',
      header: '',
      align: 'right',
      cell: (d) =>
        d.retryable && canRetry ? (
          <Button size="sm" variant="outline" loading={retry.isPending} onClick={() => retry.mutate(d)}>
            Relancer
          </Button>
        ) : d.status === 'failed' ? (
          <span className="text-xs text-ink-muted">Code ou lien : la personne en redemande un</span>
        ) : null,
    },
  ];

  return (
    <>
      <PageIntro>
        Chaque e-mail est envoyé par Resend avec plusieurs reprises automatiques. Un e-mail en échec après toutes les
        reprises peut être relancé, sauf s’il contenait un code ou un lien d’accès.
      </PageIntro>
      <StatRow
        items={[
          { label: 'E-mails suivis', value: deliveries.length },
          { label: 'En échec', value: deliveries.filter((d) => d.status === 'failed').length },
          { label: 'En cours', value: deliveries.filter((d) => d.status === 'sending').length },
          { label: 'Envoyés', value: deliveries.filter((d) => d.status === 'sent').length },
        ]}
      />
      <Toolbar>
        <Segmented
          label="Statut"
          value={filter}
          onChange={setFilter}
          options={(Object.keys(labels) as Filter[]).map((f) => ({
            value: f,
            label: labels[f],
            count: deliveries.filter((d) => inFilter(d, f)).length,
          }))}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Destinataire, objet" />
      </Toolbar>
      <AdminTable
        key={filter + query}
        caption="Suivi des e-mails"
        columns={columns}
        rows={rows}
        rowKey={(d) => d.id}
        empty="Aucun e-mail dans cette liste."
      />
    </>
  );
}
