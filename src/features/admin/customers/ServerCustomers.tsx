import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { formatDate, formatDateTime } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/text';
import { matches } from '../admin.utils';
import { useAdminMutation } from '../admin.queries';
import { adminCustomersBackend, type CustomerSummary, type ReferralReward } from '../adminCustomers.backend';
import { AdminTable, type Column } from '../components/AdminTable';
import { ReasonDialog } from '../components/ReasonDialog';
import { OrderStatusBadge, StateBadge } from '../components/StatusBadges';
import { PageIntro, SearchInput, Segmented, StatRow, Toolbar } from '../components/Toolbar';
import { correctionError } from '../loyalty.rules';
import { can } from '../permissions';

type Filter = 'all' | 'repeat' | 'or' | 'argent' | 'bronze';
const tierLabel = { bronze: 'Bronze', argent: 'Argent', or: 'Or' } as const;
const labels: Record<Filter, string> = {
  all: 'Tous',
  repeat: 'Clients fidèles',
  or: 'Or',
  argent: 'Argent',
  bronze: 'Bronze',
};
const inFilter = (c: CustomerSummary, f: Filter) => f === 'all' || (f === 'repeat' ? c.orderCount >= 2 : c.tier === f);

/** Fichier clients sur l'API : coordonnées masquées par le serveur sans le droit sur les données sensibles. */
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
    .filter((c) => inFilter(c, filter) && matches(query, `${c.firstName} ${c.lastName}`, c.email, c.phone ?? ''))
    .sort((a, b) => b.totalSpent - a.totalSpent);
  const buyers = customers.filter((c) => c.orderCount > 0);

  const columns: Column<CustomerSummary>[] = [
    {
      key: 'name',
      header: 'Client',
      cell: (c) => (
        <span className="min-w-0">
          <span className="block font-semibold">
            {c.firstName} {c.lastName}
          </span>
          <span className="block truncate text-xs text-ink-muted">{c.email}</span>
        </span>
      ),
    },
    { key: 'phone', header: 'Téléphone', cell: (c) => <span className="whitespace-nowrap">{c.phone ?? ''}</span> },
    { key: 'orders', header: 'Commandes', align: 'right', cell: (c) => c.orderCount },
    {
      key: 'spent',
      header: 'Total dépensé',
      align: 'right',
      cell: (c) => <span className="font-semibold tabular-nums">{formatPrice(c.totalSpent)}</span>,
    },
    {
      key: 'tier',
      header: 'Niveau',
      cell: (c) => <StateBadge tone={c.tier === 'or' ? 'warning' : 'neutral'}>{tierLabel[c.tier]}</StateBadge>,
    },
    {
      key: 'points',
      header: 'Points',
      align: 'right',
      cell: (c) => <span className={c.points < 0 ? 'font-semibold text-danger' : undefined}>{c.points}</span>,
    },
    { key: 'since', header: 'Inscrit le', cell: (c) => formatDate(c.createdAt) },
  ];

  return (
    <>
      <PageIntro>
        Les données personnelles des clients ne servent qu’au traitement de leurs commandes. Sans le droit sur les
        données sensibles, e-mails, téléphones et adresses sont masqués.
      </PageIntro>
      <StatRow
        items={[
          { label: 'Comptes clients', value: customers.length },
          { label: 'Ont déjà commandé', value: buyers.length },
          {
            label: 'Taux de réachat',
            value: `${buyers.length ? Math.round((buyers.filter((c) => c.orderCount >= 2).length / buyers.length) * 100) : 0}\u00a0%`,
          },
          { label: 'Points en circulation', value: customers.reduce((s, c) => s + c.points, 0) },
        ]}
      />
      <PendingReferrals customers={customers} />
      <Toolbar>
        <Segmented
          label="Segment"
          value={filter}
          onChange={setFilter}
          options={(Object.keys(labels) as Filter[]).map((f) => ({
            value: f,
            label: labels[f],
            count: customers.filter((c) => inFilter(c, f)).length,
          }))}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Nom, e-mail, téléphone" />
      </Toolbar>
      <AdminTable
        key={filter + query}
        caption="Clients"
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        onRowClick={setSelected}
        empty="Aucun client ne correspond."
      />
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.firstName} ${selected.lastName}` : ''}
      >
        {selected && <CustomerDetailPanel id={selected.id} />}
      </Drawer>
    </>
  );
}

function CustomerDetailPanel({ id }: { id: string }) {
  const { data: c, isLoading } = useQuery({
    queryKey: ['admin', 'customer', id],
    queryFn: ({ signal }) => adminCustomersBackend.detail(id, signal),
  });
  const [correcting, setCorrecting] = useState(false);
  if (isLoading || !c) return <PageLoader />;

  return (
    <div className="space-y-6 p-5 text-sm">
      <dl className="grid grid-cols-2 gap-3">
        <Info label="E-mail" value={c.email} />
        <Info label="Téléphone" value={c.phone ?? ''} />
        <Info label="Niveau" value={tierLabel[c.tier]} />
        <Info label="Points" value={String(c.points)} />
        <Info label="Total dépensé" value={formatPrice(c.totalSpent)} />
        <Info label="Parrainage" value={c.referralCode} />
      </dl>
      {c.addresses.length > 0 && (
        <section>
          <h3 className="mb-2 font-bold">Adresses</h3>
          <ul className="space-y-2">
            {c.addresses.map((a) => (
              <li key={a.id} className="text-ink-soft">
                <span className="font-medium text-ink">{a.label}</span> ({a.zoneName}) : {a.landmark}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="font-bold">Fidélité</h3>
          <Button size="sm" variant="outline" onClick={() => setCorrecting(true)}>
            Corriger les points
          </Button>
        </div>
        <p className={cn('font-semibold', c.points < 0 && 'text-danger')}>
          Solde : {c.points} points
          {c.points < 0 && ' · utilisation des points bloquée jusqu’au retour à un solde positif'}
        </p>
        {c.movements.length === 0 ? (
          <p className="mt-2 text-ink-muted">Aucun mouvement de points.</p>
        ) : (
          <ul className="mt-2 divide-y divide-sage">
            {c.movements.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block font-medium">{m.label}</span>
                  <span className="block text-xs text-ink-muted">
                    {formatDateTime(m.createdAt)}
                    {m.staffName && ` · ${m.staffName}`}
                  </span>
                </span>
                <span
                  className={cn('shrink-0 font-semibold tabular-nums', m.points < 0 ? 'text-danger' : 'text-forest')}
                >
                  {m.points > 0 ? '+' : ''}
                  {m.points}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-ink-muted">
          L’historique n’est jamais modifié : une erreur se corrige par un nouveau mouvement motivé.
        </p>
      </section>
      <section>
        <h3 className="mb-2 font-bold">Commandes ({c.orders.length})</h3>
        <ul className="divide-y divide-sage">
          {c.orders.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
              <span>
                <span className="block font-semibold">{o.number}</span>
                <span className="block text-xs text-ink-muted">{formatDateTime(o.createdAt)}</span>
              </span>
              <span className="flex flex-col items-end gap-1">
                <span className="font-semibold tabular-nums">{formatPrice(o.total)}</span>
                <OrderStatusBadge status={o.status} />
              </span>
            </li>
          ))}
        </ul>
      </section>
      {correcting && (
        <CorrectionDialog
          customerId={c.id}
          name={`${c.firstName} ${c.lastName}`}
          balance={c.points}
          onClose={() => setCorrecting(false)}
        />
      )}
    </div>
  );
}

function CorrectionDialog({
  customerId,
  name,
  balance,
  onClose,
}: {
  customerId: string;
  name: string;
  balance: number;
  onClose: () => void;
}) {
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const correct = useAdminMutation(
    (n: number) => adminCustomersBackend.adjust(customerId, n, reason.trim()),
    (n) => `Points de ${name} corrigés : ${n > 0 ? '+' : ''}${n} (${reason.trim()})`,
  );
  const submit = () => {
    const n = Number(points.trim().replace(/\s/g, ''));
    const e = correctionError(n, reason);
    if (e) return setError(e);
    correct.mutate(n, { onSuccess: onClose });
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Corriger les points"
      description={`Solde actuel : ${balance} points. La correction est ajoutée à l’historique avec votre nom.`}
    >
      <div className="space-y-4">
        <TextField
          label="Points à ajouter ou retirer"
          inputMode="numeric"
          placeholder="Ex. 50 ou -120"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
        />
        <TextField label="Motif" value={reason} onChange={(e) => setReason(e.target.value)} />
        {error && (
          <p className="text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button loading={correct.isPending} onClick={submit}>
            Enregistrer la correction
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Récompenses de parrainage suspectes, créditées seulement après validation (12.5). */
function PendingReferrals({ customers }: { customers: CustomerSummary[] }) {
  const admin = useAdminAuthStore((s) => s.admin);
  const allowed = can(admin, 'clients:valider');
  const { data: pending = [] } = useQuery({
    queryKey: ['admin', 'referrals', 'pending'],
    queryFn: ({ signal }) => adminCustomersBackend.pendingReferrals(signal),
    enabled: allowed,
  });
  const [decision, setDecision] = useState<{ reward: ReferralReward; grant: boolean } | null>(null);
  const name = (id: string) => {
    const c = customers.find((x) => x.id === id);
    return c ? `${c.firstName} ${c.lastName}` : 'Client';
  };
  const review = useAdminMutation(
    ({ reward, grant, note }: { reward: ReferralReward; grant: boolean; note: string }) =>
      adminCustomersBackend.decideReferral(reward.id, grant, note),
    (v) => `Parrainage ${v.grant ? 'validé' : 'refusé'} : ${name(v.reward.referrerId)} (${v.note})`,
  );
  if (!pending.length) return null;
  return (
    <section className="mb-6 rounded-xl border border-warning/40 bg-white p-4">
      <h2 className="mb-2 font-bold">Parrainages à vérifier ({pending.length})</h2>
      <ul className="divide-y divide-sage text-sm">
        {pending.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
            <span className="min-w-0">
              <span className="block font-semibold">
                {name(r.referrerId)} : {r.points} points
              </span>
              <span className="block text-ink-soft">
                Filleul {r.refereeName}, commande {r.orderNumber}
              </span>
              <span className="block text-xs text-warning">{r.signals.join(' · ')}</span>
            </span>
            <span className="flex gap-2">
              <Button size="sm" onClick={() => setDecision({ reward: r, grant: true })}>
                Valider
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDecision({ reward: r, grant: false })}>
                Refuser
              </Button>
            </span>
          </li>
        ))}
      </ul>
      <ReasonDialog
        open={!!decision}
        onClose={() => setDecision(null)}
        title={decision?.grant ? 'Valider la récompense' : 'Refuser la récompense'}
        description="La décision et son motif sont conservés avec la récompense."
        label="Motif"
        confirmLabel={decision?.grant ? 'Valider' : 'Refuser'}
        danger={!decision?.grant}
        loading={review.isPending}
        onConfirm={(note) => decision && review.mutate({ ...decision, note }, { onSuccess: () => setDecision(null) })}
      />
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}
