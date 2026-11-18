import { Info, OctagonAlert, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { TextAreaField } from '@/components/ui/TextField';
import { adminApi } from '@/features/admin/admin.api';
import { useAdminAlerts, useAdminMutation, useAdminSettings, useAdminTeam } from '@/features/admin/admin.queries';
import {
  alertChannels,
  alertStateLabel,
  closureError,
  isEscalated,
  type AlertRecord,
  type AlertState,
} from '@/features/admin/alerts.rules';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { ReasonDialog } from '@/features/admin/components/ReasonDialog';
import { StateBadge } from '@/features/admin/components/StatusBadges';
import { PageIntro, Segmented, StatRow, Toolbar } from '@/features/admin/components/Toolbar';
import { useSelection } from '@/features/admin/useSelection';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { isRecipient, recipientRoles } from '@/features/admin/alertRecipients';
import { formatDateTime } from '@/utils/formatDate';
import { cn } from '@/utils/text';

const level = {
  critical: { icon: OctagonAlert, className: 'text-danger', label: 'Critique' },
  warning: { icon: TriangleAlert, className: 'text-warning', label: 'Avertissement' },
  info: { icon: Info, className: 'text-ink-muted', label: 'Information' },
};
const stateTone: Record<AlertState, 'warning' | 'neutral' | 'forest'> = {
  new: 'warning',
  in_progress: 'neutral',
  resolved: 'forest',
  closed: 'neutral',
};

type Filter = 'open' | AlertState | 'all';

/** Alertes (17.6) : niveaux, états, historique des épisodes, clôture justifiée et escalade. */
export default function AdminAlertsPage() {
  const { data: allAlerts, isLoading } = useAdminAlerts();
  const me = useAdminAuthStore((s) => s.admin);
  // Chaque membre ne voit que les alertes de ses domaines (17.6)
  const alerts = useMemo(() => allAlerts?.filter((a) => isRecipient(me, a.key)), [allAlerts, me]);
  const { data: settings } = useAdminSettings();
  const { data: team = [] } = useAdminTeam();
  const [filter, setFilter] = useState<Filter>('open');
  const [now] = useState(() => Date.now());
  const { selected, open, close } = useSelection(alerts);
  const hours = settings?.alertEscalationHours ?? 4;

  if (isLoading || !alerts) return <PageLoader />;

  const isOpen = (a: AlertRecord) => a.state === 'new' || a.state === 'in_progress';
  const test = (a: AlertRecord, f: Filter) => (f === 'all' ? true : f === 'open' ? isOpen(a) : a.state === f);
  const rows = alerts
    .filter((a) => test(a, filter))
    .sort(
      (a, b) => ['critical', 'warning', 'info'].indexOf(a.level) - ['critical', 'warning', 'info'].indexOf(b.level),
    );
  const name = new Map(team.map((m) => [m.id, `${m.firstName} ${m.lastName}`]));

  const columns: Column<AlertRecord>[] = [
    {
      key: 'alert',
      header: 'Alerte',
      cell: (a) => {
        const l = level[a.level];
        return (
          <span className="flex items-start gap-2.5">
            <l.icon className={cn('mt-0.5 size-4 shrink-0', l.className)} aria-label={l.label} />
            <span className="min-w-0">
              <span className="block font-semibold">{a.title}</span>
              <span className="line-clamp-1 block max-w-md text-xs text-ink-muted">{a.detail}</span>
              {isEscalated(a, now, hours) && (
                <span className="block text-xs font-semibold text-danger">
                  Relance : non prise en charge depuis plus de {hours} h
                </span>
              )}
              {a.cleared && isOpen(a) && (
                <span className="block text-xs text-forest">Situation plus détectée : à résoudre</span>
              )}
            </span>
          </span>
        );
      },
    },
    {
      key: 'state',
      header: 'État',
      cell: (a) => <StateBadge tone={stateTone[a.state]}>{alertStateLabel[a.state]}</StateBadge>,
    },
    {
      key: 'owner',
      header: 'Responsable',
      cell: (a) => (a.assigneeId ? name.get(a.assigneeId) : <span className="text-ink-muted">-</span>),
    },
    { key: 'count', header: 'Épisodes', align: 'right', cell: (a) => a.occurrences },
    {
      key: 'since',
      header: 'Depuis',
      cell: (a) => (
        <span className="whitespace-nowrap">{formatDateTime(a.episodes.at(-1)?.openedAt ?? a.firstSeenAt)}</span>
      ),
    },
  ];

  const labels: Record<Filter, string> = {
    open: 'Ouvertes',
    new: 'Nouvelles',
    in_progress: 'En cours',
    resolved: 'Résolues',
    closed: 'Clôturées',
    all: 'Toutes',
  };

  return (
    <>
      <PageIntro>
        Chaque alerte suit un dossier : nouvelle, en cours, résolue puis clôturée avec une justification. Une alerte qui
        réapparaît rouvre son dossier ; une alerte critique non prise en charge après {hours} h est relancée.
      </PageIntro>
      <StatRow
        items={[
          { label: 'Ouvertes', value: alerts.filter(isOpen).length },
          { label: 'Critiques ouvertes', value: alerts.filter((a) => isOpen(a) && a.level === 'critical').length },
          { label: 'En relance', value: alerts.filter((a) => isEscalated(a, now, hours)).length },
          { label: 'Clôturées', value: alerts.filter((a) => a.state === 'closed').length },
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
            count: alerts.filter((a) => test(a, f)).length,
          }))}
        />
      </Toolbar>
      <AdminTable
        key={filter}
        caption="Alertes"
        columns={columns}
        rows={rows}
        rowKey={(a) => a.id}
        onRowClick={open}
        empty="Aucune alerte dans cette liste."
      />
      <AlertDrawer alert={selected} onClose={close} />
    </>
  );
}

function AlertDrawer({ alert, onClose }: { alert: AlertRecord | null; onClose: () => void }) {
  const admin = useAdminAuthStore((s) => s.admin);
  const [dialog, setDialog] = useState<'resolve' | 'close' | null>(null);
  const by = admin ? `${admin.firstName} ${admin.lastName}` : 'Équipe';
  const update = useAdminMutation(
    ({ patch }: { patch: Partial<AlertRecord>; message: string }) => adminApi.updateAlert(alert!.id, patch),
    (v) => v.message,
  );
  if (!alert)
    return (
      <Drawer open={false} onClose={onClose} title="">
        {null}
      </Drawer>
    );

  const now = new Date().toISOString();
  const event = (text: string) => [...alert.history, { at: now, by, event: text }];
  const l = level[alert.level];
  const done = () => setDialog(null);

  return (
    <Drawer
      open
      onClose={onClose}
      title={alert.title}
      className="sm:max-w-lg"
      footer={
        <div className="flex flex-wrap gap-2">
          {alert.state === 'new' && (
            <Button
              loading={update.isPending}
              onClick={() =>
                update.mutate({
                  patch: { state: 'in_progress', assigneeId: admin?.id ?? null, history: event('Prise en charge') },
                  message: `Alerte prise en charge : ${alert.title}`,
                })
              }
            >
              Prendre en charge
            </Button>
          )}
          {(alert.state === 'new' || alert.state === 'in_progress') && (
            <Button variant="outline" onClick={() => setDialog('resolve')}>
              Marquer résolue
            </Button>
          )}
          {alert.state !== 'closed' && (
            <Button variant="outline" onClick={() => setDialog('close')}>
              Clôturer
            </Button>
          )}
          {(alert.state === 'resolved' || alert.state === 'closed') && (
            <Button
              variant="ghost"
              onClick={() =>
                update.mutate({
                  patch: {
                    state: 'new',
                    episodes: [...alert.episodes, { openedAt: now }],
                    occurrences: alert.occurrences + 1,
                    history: event('Rouverte manuellement'),
                  },
                  message: `Alerte rouverte : ${alert.title}`,
                })
              }
            >
              Rouvrir
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5 p-5 text-sm">
        <p className={cn('flex items-center gap-2 font-semibold', l.className)}>
          <l.icon className="size-4" aria-hidden="true" />
          {l.label} · {alertStateLabel[alert.state]}
        </p>
        <p className="text-ink-soft">{alert.detail}</p>
        <p className="text-xs text-ink-muted">
          Canaux : {alertChannels[alert.level]} (envoi assuré par l’API en production). Destinataires :{' '}
          {recipientRoles(alert.key).join(', ')}.
        </p>
        <Link to={alert.to} className="inline-block font-semibold text-forest hover:underline">
          Ouvrir l’écran concerné
        </Link>
        {alert.closureReason && (
          <p className="rounded-md bg-ivory p-3">
            <span className="font-semibold">Justification : </span>
            {alert.closureReason}
            {alert.actionTaken && (
              <>
                <br />
                <span className="font-semibold">Action : </span>
                {alert.actionTaken}
              </>
            )}
          </p>
        )}
        <section>
          <h3 className="mb-2 font-bold">Épisodes ({alert.episodes.length})</h3>
          <ul className="space-y-1 text-ink-soft">
            {alert.episodes.map((e, i) => (
              <li key={i}>
                Ouvert le {formatDateTime(e.openedAt)}
                {e.resolvedAt && `, résolu le ${formatDateTime(e.resolvedAt)}`}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-2 font-bold">Historique</h3>
          <ol className="space-y-2 border-l-2 border-sage pl-4">
            {[...alert.history].reverse().map((h, i) => (
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
        open={dialog === 'resolve'}
        onClose={done}
        title="Marquer l’alerte résolue"
        label="Ce qui a été fait"
        confirmLabel="Marquer résolue"
        loading={update.isPending}
        onConfirm={(note) =>
          update.mutate(
            {
              patch: {
                state: 'resolved',
                episodes: alert.episodes.map((e, i) =>
                  i === alert.episodes.length - 1 ? { ...e, resolvedAt: now } : e,
                ),
                history: event(`Résolue : ${note}`),
              },
              message: `Alerte résolue : ${alert.title}`,
            },
            { onSuccess: done },
          )
        }
      />
      {dialog === 'close' && (
        <CloseDialog
          alert={alert}
          loading={update.isPending}
          onClose={done}
          onConfirm={(reason, action) =>
            update.mutate(
              {
                patch: {
                  state: 'closed',
                  closureReason: reason,
                  actionTaken: action || undefined,
                  episodes: alert.episodes.map((e, i) =>
                    i === alert.episodes.length - 1 && !e.resolvedAt ? { ...e, resolvedAt: now } : e,
                  ),
                  history: event(`Clôturée : ${reason}`),
                },
                message: `Alerte clôturée : ${alert.title}`,
              },
              { onSuccess: done },
            )
          }
        />
      )}
    </Drawer>
  );
}

function CloseDialog({
  alert,
  loading,
  onClose,
  onConfirm,
}: {
  alert: AlertRecord;
  loading: boolean;
  onClose: () => void;
  onConfirm: (reason: string, action: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [action, setAction] = useState('');
  const [error, setError] = useState('');
  return (
    <Modal
      open
      onClose={onClose}
      title="Clôturer l’alerte"
      description="La justification est conservée dans le dossier."
    >
      <div className="space-y-4">
        <TextAreaField label="Justification" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        <TextAreaField
          label={alert.level === 'critical' ? 'Action effectuée (ou motif d’absence d’action)' : 'Action effectuée'}
          optional={alert.level !== 'critical'}
          rows={2}
          value={action}
          onChange={(e) => setAction(e.target.value)}
        />
        {error && (
          <p className="text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            loading={loading}
            onClick={() => {
              const e = closureError(alert, reason, action);
              if (e) return setError(e);
              onConfirm(reason.trim(), action.trim());
            }}
          >
            Clôturer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
