import { useState } from 'react';
import { privacyBackend } from '@/features/privacy/privacy.backend';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Drawer } from '@/components/ui/Drawer';
import { useAdminMutation, usePrivacyRequests } from '@/features/admin/admin.queries';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { ReasonDialog } from '@/features/admin/components/ReasonDialog';
import { StateBadge } from '@/features/admin/components/StatusBadges';
import { PageIntro, Segmented, StatRow, Toolbar } from '@/features/admin/components/Toolbar';
import { useSelection } from '@/features/admin/useSelection';
import { RetentionPanel } from '@/features/admin/components/RetentionPanel';
import { isOwner } from '@/features/admin/permissions';
import { downloadJson } from '@/features/privacy/privacy.api';
import { isOverdue, privacyStatusLabel, privacyTypeLabel } from '@/features/privacy/privacy.rules';
import type { PrivacyRequest, PrivacyRequestStatus } from '@/features/privacy/privacy.types';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { formatDate, formatDateTime } from '@/utils/formatDate';

const tone: Record<PrivacyRequestStatus, 'warning' | 'neutral' | 'forest' | 'danger'> = {
  received: 'warning',
  in_progress: 'neutral',
  completed: 'forest',
  refused: 'danger',
};
type Filter = 'open' | 'completed' | 'refused' | 'all';
const isOpen = (r: PrivacyRequest) => r.status === 'received' || r.status === 'in_progress';

/** Demandes sur les données personnelles (19.5) : accès, export, correction, suppression avec anonymisation. */
export default function AdminPrivacyPage() {
  const { data: requests, isLoading } = usePrivacyRequests();
  const admin = useAdminAuthStore((s) => s.admin);
  const [filter, setFilter] = useState<Filter>('open');
  const [now] = useState(() => Date.now());
  const { selected, open, close } = useSelection(requests);

  if (isLoading || !requests) return <PageLoader />;

  const test = (r: PrivacyRequest, f: Filter) => (f === 'all' ? true : f === 'open' ? isOpen(r) : r.status === f);
  const rows = requests.filter((r) => test(r, filter));
  const columns: Column<PrivacyRequest>[] = [
    {
      key: 'request',
      header: 'Demande',
      cell: (r) => (
        <>
          <span className="block font-semibold">{privacyTypeLabel[r.type]}</span>
          <span className="block text-xs text-ink-muted">{r.number}</span>
        </>
      ),
    },
    {
      key: 'customer',
      header: 'Client',
      cell: (r) => (
        <>
          <span className="block font-medium">{r.name}</span>
          <span className="block text-xs text-ink-muted">{r.email}</span>
        </>
      ),
    },
    {
      key: 'state',
      header: 'État',
      cell: (r) => <StateBadge tone={tone[r.status]}>{privacyStatusLabel[r.status]}</StateBadge>,
    },
    {
      key: 'due',
      header: 'Réponse avant le',
      cell: (r) =>
        isOpen(r) ? (
          <span className={isOverdue(r, now) ? 'font-semibold text-danger' : undefined}>
            {formatDate(r.dueAt)}
            {isOverdue(r, now) && ' (dépassé)'}
          </span>
        ) : (
          <span className="text-ink-muted">-</span>
        ),
    },
    { key: 'at', header: 'Reçue le', cell: (r) => formatDate(r.createdAt) },
  ];
  const labels: Record<Filter, string> = {
    open: 'À traiter',
    completed: 'Traitées',
    refused: 'Refusées',
    all: 'Toutes',
  };

  return (
    <>
      <PageIntro>
        Chaque demande reçoit une réponse sous 30 jours. La suppression anonymise le compte : les montants des commandes
        restent pour la comptabilité, sans nom ni coordonnées.
      </PageIntro>
      <StatRow
        items={[
          { label: 'À traiter', value: requests.filter(isOpen).length },
          { label: 'En retard', value: requests.filter((r) => isOverdue(r, now)).length },
          {
            label: 'Suppressions traitées',
            value: requests.filter((r) => r.type === 'deletion' && r.status === 'completed').length,
          },
          { label: 'Total', value: requests.length },
        ]}
      />
      <Toolbar>
        <Segmented
          label="État"
          value={filter}
          onChange={setFilter}
          options={(Object.keys(labels) as Filter[]).map((f) => ({
            value: f,
            label: labels[f],
            count: requests.filter((r) => test(r, f)).length,
          }))}
        />
      </Toolbar>
      <AdminTable
        key={filter}
        caption="Demandes sur les données personnelles"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={open}
        empty="Aucune demande dans cette liste."
      />
      {isOwner(admin) && <RetentionPanel />}
      <RequestDrawer request={selected} onClose={close} />
    </>
  );
}

function RequestDrawer({ request, onClose }: { request: PrivacyRequest | null; onClose: () => void }) {
  const [dialog, setDialog] = useState<'complete' | 'refuse' | 'anonymize' | null>(null);
  // Le serveur tient l'historique et anonymise lui-même à la clôture d'une suppression
  const update = useAdminMutation(
    ({ intent }: { message: string; intent: () => Promise<unknown> }) => intent(),
    (v) => v.message,
  );
  if (!request)
    return (
      <Drawer open={false} onClose={onClose} title="">
        {null}
      </Drawer>
    );

  const done = () => setDialog(null);
  const exportData = () =>
    update.mutate({
      intent: async () => downloadJson(await privacyBackend.staffExport(request.id), `donnees-${request.number}.json`),
      message: `Export généré pour ${request.number}`,
    });

  return (
    <Drawer
      open
      onClose={onClose}
      title={`${privacyTypeLabel[request.type]} · ${request.number}`}
      className="sm:max-w-lg"
      footer={
        isOpen(request) && (
          <div className="flex flex-wrap gap-2">
            {request.status === 'received' && (
              <Button
                loading={update.isPending}
                onClick={() =>
                  update.mutate({
                    intent: () => privacyBackend.decide(request.id, 'in_progress'),
                    message: `${request.number} prise en charge`,
                  })
                }
              >
                Prendre en charge
              </Button>
            )}
            {request.type === 'deletion' ? (
              <Button variant="danger" onClick={() => setDialog('anonymize')}>
                Anonymiser le compte
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setDialog('complete')}>
                Marquer traitée
              </Button>
            )}
            <Button variant="ghost" onClick={() => setDialog('refuse')}>
              Refuser
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-5 p-5 text-sm">
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs text-ink-muted">Client</dt>
            <dd className="font-medium">{request.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">E-mail</dt>
            <dd className="truncate font-medium">{request.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Reçue le</dt>
            <dd className="font-medium">{formatDateTime(request.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Réponse avant le</dt>
            <dd className="font-medium">{formatDate(request.dueAt)}</dd>
          </div>
        </dl>
        {request.details && (
          <p className="rounded-md bg-ivory p-3">
            <span className="font-semibold">Demande : </span>
            {request.details}
          </p>
        )}
        {(request.type === 'access' || request.type === 'export') && (
          <Button size="sm" variant="outline" onClick={exportData}>
            Générer l’export des données
          </Button>
        )}
        {request.type === 'correction' && (
          <p className="text-ink-soft">
            Corrigez les informations dans la fiche du client ou de la commande, puis marquez la demande traitée.
          </p>
        )}
        {request.response && (
          <p className="rounded-md bg-ivory p-3">
            <span className="font-semibold">Réponse : </span>
            {request.response}
          </p>
        )}
        <section>
          <h3 className="mb-2 font-bold">Historique</h3>
          <ol className="space-y-2 border-l-2 border-sage pl-4">
            {[...request.history].reverse().map((h, i) => (
              <li key={i}>
                <p className="font-medium">{h.event}</p>
                <p className="text-xs text-ink-muted">
                  {formatDateTime(h.at)} · {h.by}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <ReasonDialog
        open={dialog === 'complete'}
        onClose={done}
        title="Marquer la demande traitée"
        description="La réponse est visible par le client dans son compte."
        label="Réponse au client"
        confirmLabel="Marquer traitée"
        loading={update.isPending}
        onConfirm={(response) =>
          update.mutate(
            {
              intent: () => privacyBackend.decide(request.id, 'completed', response),
              message: `${request.number} traitée`,
            },
            { onSuccess: done },
          )
        }
      />
      <ReasonDialog
        open={dialog === 'refuse'}
        onClose={done}
        title="Refuser la demande"
        description="Le motif est communiqué au client (par exemple : identité non vérifiée)."
        confirmLabel="Refuser"
        danger
        loading={update.isPending}
        onConfirm={(response) =>
          update.mutate(
            {
              intent: () => privacyBackend.decide(request.id, 'refused', response),
              message: `${request.number} refusée`,
            },
            { onSuccess: done },
          )
        }
      />
      <ConfirmDialog
        open={dialog === 'anonymize'}
        title={`Anonymiser le compte de ${request.name} ?`}
        description="Nom, coordonnées, adresses, favoris et accès au compte sont effacés définitivement. Les commandes restent, sans données personnelles. Impossible si une commande est en cours."
        confirmLabel="Anonymiser"
        tone="danger"
        loading={update.isPending}
        onClose={done}
        onConfirm={() =>
          update.mutate(
            {
              intent: () => privacyBackend.decide(request.id, 'completed'),
              message: `Compte anonymisé (${request.number})`,
            },
            { onSuccess: done },
          )
        }
      />
    </Drawer>
  );
}
