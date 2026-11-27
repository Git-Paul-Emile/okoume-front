import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { SelectField, TextField } from '@/components/ui/TextField';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { useAdminMutation } from '../admin.queries';
import { adminMarketplaceBackend, type ShopAction, type StaffShop } from '../adminMarketplace.backend';
import { ReasonDialog } from '../components/ReasonDialog';
import { can } from '../permissions';

const pageCount = (data: { total: number; limit: number } | undefined) =>
  data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

export function ShopsTab() {
  const admin = useAdminAuthStore((state) => state.admin);
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
  const canManage = can(admin, 'vendeurs:valider');

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          setSubmitted(search);
          setPage(1);
        }}
      >
        <TextField label="Rechercher" value={search} onChange={(event) => setSearch(event.target.value)} />
        <SelectField label="État" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
          <option value="">Toutes</option>
          <option value="active">Actives</option>
          <option value="suspended">Suspendues</option>
        </SelectField>
        <Button type="submit" variant="outline">Rechercher</Button>
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
                <p className="font-semibold">{shop.name} <span className="font-normal text-ink-muted">({shop.city})</span></p>
                <div className="flex flex-wrap gap-1.5">
                  {shop.verified && <Badge tone="forest">Vérifiée</Badge>}
                  <Badge tone={shop.status === 'suspended' ? 'danger' : 'neutral'}>
                    {shop.status === 'active' ? 'Active' : 'Suspendue'}
                  </Badge>
                </div>
              </div>
              <p className="text-ink-muted">
                Téléphone {shop.phone}
                {shop.suspensionReason && `. Motif : ${shop.suspensionReason}`}
              </p>
              {canManage && (
                <div className="flex flex-wrap gap-2">
                  {shop.status === 'active' ? (
                    <Button size="sm" variant="danger" onClick={() => setSuspending(shop)}>Suspendre</Button>
                  ) : (
                    <Button size="sm" onClick={() => act.mutate({ shop, action: { action: 'reinstate' } })}>Réactiver</Button>
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
        description="Ses produits ne sont plus visibles. Le motif est communiqué au vendeur."
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
