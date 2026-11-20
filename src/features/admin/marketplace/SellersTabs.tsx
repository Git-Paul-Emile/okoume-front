import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { SelectField, TextField } from '@/components/ui/TextField';
import { accessLabel, decisionLabel } from '@/features/seller/seller.backend';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { formatDate, formatDateTime } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';
import { useAdminMutation } from '../admin.queries';
import { adminMarketplaceBackend, type Decision, type ShopAction, type StaffShop } from '../adminMarketplace.backend';
import { ReasonDialog } from '../components/ReasonDialog';
import { can } from '../permissions';

type DecisionStatus = 'pending' | 'validated' | 'refused';
const STATUSES: Array<{ value: DecisionStatus | ''; label: string }> = [
  { value: 'pending', label: 'À vérifier' },
  { value: 'validated', label: 'Validés' },
  { value: 'refused', label: 'Refusés' },
  { value: '', label: 'Tous' },
];
const asStatus = (v: string) => STATUSES.find((s) => s.value === v)?.value ?? '';
const pageCount = (data: { total: number; limit: number } | undefined) =>
  data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

/** Boutiques : suspension motivée, réactivation, badge « Vendeur vérifié ». */
export function ShopsTab() {
  const admin = useAdminAuthStore((s) => s.admin);
  const [status, setStatus] = useState<'active' | 'suspended' | ''>('');
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [page, setPage] = useState(1);
  const [suspending, setSuspending] = useState<StaffShop | null>(null);
  const query = useQuery({
    queryKey: ['admin', 'marketplace', 'shops', status, submitted, page],
    queryFn: ({ signal }) =>
      adminMarketplaceBackend.shops({ ...(status ? { status } : {}), search: submitted }, page, signal),
    placeholderData: keepPreviousData,
  });
  const act = useAdminMutation(
    ({ shop, action }: { shop: StaffShop; action: ShopAction }) => adminMarketplaceBackend.actOnShop(shop.id, action),
    ({ shop, action }) =>
      ({
        suspend: `${shop.name} suspendue`,
        reinstate: `${shop.name} réactivée`,
        verify: `${shop.name} marquée vérifiée`,
        unverify: `Badge retiré à ${shop.name}`,
      })[action.action],
  );
  const decide = can(admin, 'vendeurs:valider');

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          setSubmitted(search);
          setPage(1);
        }}
      >
        <TextField label="Rechercher" value={search} onChange={(e) => setSearch(e.target.value)} />
        <SelectField
          label="État"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value === 'active' ? 'active' : e.target.value === 'suspended' ? 'suspended' : '');
            setPage(1);
          }}
        >
          <option value="">Toutes</option>
          <option value="active">Actives</option>
          <option value="suspended">Suspendues</option>
        </SelectField>
        <Button type="submit" variant="outline">
          Rechercher
        </Button>
      </form>
      {query.isLoading ? (
        <PageLoader />
      ) : query.isError || !query.data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <p className="card p-6 text-ink-soft">Aucune boutique.</p>
      ) : (
        <ul className="card divide-y divide-sage text-sm">
          {query.data.items.map((shop) => (
            <li key={shop.id} className="space-y-1.5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {shop.name} <span className="font-normal text-ink-muted">({shop.city})</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {shop.verified && <Badge tone="forest">Vérifiée</Badge>}
                  <Badge tone={shop.status === 'suspended' ? 'danger' : 'neutral'}>
                    {accessLabel[shop.access.state]}
                  </Badge>
                </div>
              </div>
              <p className="text-ink-muted">
                Offre {shop.plan.name}, téléphone {shop.phone}
                {shop.suspensionReason && `. Motif de suspension : ${shop.suspensionReason}`}
              </p>
              {decide && (
                <div className="flex flex-wrap gap-2">
                  {shop.status === 'active' ? (
                    <Button size="sm" variant="danger" onClick={() => setSuspending(shop)}>
                      Suspendre
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => act.mutate({ shop, action: { action: 'reinstate' } })}>
                      Réactiver
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => act.mutate({ shop, action: { action: shop.verified ? 'unverify' : 'verify' } })}
                  >
                    {shop.verified ? 'Retirer le badge vérifié' : 'Marquer vérifiée'}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageCount={pageCount(query.data)} onChange={setPage} />
      <ReasonDialog
        open={!!suspending}
        onClose={() => setSuspending(null)}
        title={`Suspendre ${suspending?.name ?? ''}`}
        description="Ses annonces ne sont plus visibles. Le motif est communiqué au vendeur."
        confirmLabel="Suspendre"
        danger
        loading={act.isPending}
        onConfirm={(reason) =>
          suspending &&
          act.mutate(
            { shop: suspending, action: { action: 'suspend', reason } },
            { onSuccess: () => setSuspending(null) },
          )
        }
      />
    </div>
  );
}

/** Paiements Mobile Money déclarés par les vendeurs (abonnements ou mises en avant), à vérifier. */
function DecisionList<
  T extends { id: string; status: DecisionStatus; reference: string; amount: number; createdAt: string },
>({
  kind,
  fetch,
  decide,
  describe,
}: {
  kind: 'payments' | 'boosts';
  fetch: (
    status: DecisionStatus | undefined,
    page: number,
    signal?: AbortSignal,
  ) => Promise<{ items: T[]; total: number; limit: number }>;
  decide: (id: string, decision: Decision) => Promise<unknown>;
  describe: (item: T) => string;
}) {
  const admin = useAdminAuthStore((s) => s.admin);
  const [status, setStatus] = useState<DecisionStatus | ''>('pending');
  const [page, setPage] = useState(1);
  const [refusing, setRefusing] = useState<T | null>(null);
  const query = useQuery({
    queryKey: ['admin', 'marketplace', kind, status, page],
    queryFn: ({ signal }) => fetch(status || undefined, page, signal),
    placeholderData: keepPreviousData,
  });
  const mutate = useAdminMutation(
    ({ item, decision }: { item: T; decision: Decision }) => decide(item.id, decision),
    ({ decision }) => (decision.status === 'validated' ? 'Paiement validé' : 'Paiement refusé'),
  );

  return (
    <div className="space-y-4">
      <SelectField
        label="Paiements"
        value={status}
        onChange={(e) => {
          setStatus(asStatus(e.target.value));
          setPage(1);
        }}
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </SelectField>
      {query.isLoading ? (
        <PageLoader />
      ) : query.isError || !query.data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <p className="card p-6 text-ink-soft">Aucun paiement.</p>
      ) : (
        <ul className="card divide-y divide-sage text-sm">
          {query.data.items.map((item) => (
            <li key={item.id} className="space-y-1.5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{describe(item)}</p>
                <Badge tone={item.status === 'validated' ? 'forest' : item.status === 'refused' ? 'danger' : 'warning'}>
                  {decisionLabel[item.status]}
                </Badge>
              </div>
              <p>
                {formatPrice(item.amount)}, référence <span className="font-mono">{item.reference}</span>, déclaré le{' '}
                {formatDateTime(item.createdAt)}
              </p>
              {item.status === 'pending' && can(admin, 'vendeurs:valider') && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    loading={mutate.isPending}
                    onClick={() => mutate.mutate({ item, decision: { status: 'validated' } })}
                  >
                    Fonds reçus : valider
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRefusing(item)}>
                    Refuser
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageCount={pageCount(query.data)} onChange={setPage} />
      <p className="text-xs text-ink-muted">
        Validez seulement après avoir constaté la réception des fonds sur le compte Mobile Money de la boutique Okoumé.
      </p>
      <ReasonDialog
        open={!!refusing}
        onClose={() => setRefusing(null)}
        title="Refuser le paiement"
        description="Le motif est communiqué au vendeur (montant ou référence introuvable, par exemple)."
        confirmLabel="Refuser"
        danger
        loading={mutate.isPending}
        onConfirm={(reason) =>
          refusing &&
          mutate.mutate(
            { item: refusing, decision: { status: 'refused', reason } },
            { onSuccess: () => setRefusing(null) },
          )
        }
      />
    </div>
  );
}

export function ShopPaymentsTab() {
  return (
    <DecisionList
      kind="payments"
      fetch={adminMarketplaceBackend.shopPayments}
      decide={adminMarketplaceBackend.decideShopPayment}
      describe={(p) =>
        `${p.shop.name} : offre ${p.plan.name}${p.periodEnd ? `, accès jusqu’au ${formatDate(p.periodEnd)}` : ''}`
      }
    />
  );
}
