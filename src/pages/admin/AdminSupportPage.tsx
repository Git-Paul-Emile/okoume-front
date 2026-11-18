import { supportBackend } from '@/features/support/support.backend';
import { useState, type FormEvent } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { SelectField, TextAreaField } from '@/components/ui/TextField';
import { AttachmentList } from '@/components/ui/Upload';
import { ticketStatusLabel } from '@/features/support/support.constants';
import type { Ticket, TicketStatus } from '@/features/support/support.types';
import { useAdminMutation, useAdminSettings, useAdminTickets, useTeamDirectory } from '@/features/admin/admin.queries';
import { matches } from '@/features/admin/admin.utils';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { ReasonDialog } from '@/features/admin/components/ReasonDialog';
import { StateBadge } from '@/features/admin/components/StatusBadges';
import { PageIntro, SearchInput, Segmented, StatRow, Toolbar } from '@/features/admin/components/Toolbar';
import { DEFAULT_SLA, isLate, responseDue } from '@/features/admin/support.rules';
import { useSelection } from '@/features/admin/useSelection';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { formatDateTime } from '@/utils/formatDate';
import { cn } from '@/utils/text';

type Filter = 'active' | 'mine' | 'late' | 'unassigned' | 'done';

/** Libellés vus par l'équipe (« en attente » = on attend le client). */
const statusLabel: Record<TicketStatus, string> = {
  open: 'À traiter',
  pending: 'En attente du client',
  resolved: 'Résolue',
  closed: 'Clôturée',
};
const tone: Record<TicketStatus, 'warning' | 'neutral' | 'forest'> = {
  open: 'warning',
  pending: 'neutral',
  resolved: 'forest',
  closed: 'neutral',
};
const isActive = (t: Ticket) => t.status === 'open' || t.status === 'pending';

export default function AdminSupportPage() {
  const { data: tickets, isLoading } = useAdminTickets();
  // Annuaire lisible par toute l'équipe (la liste complète reste réservée à l'administrateur principal)
  const { data: team = [] } = useTeamDirectory();
  const { data: settings } = useAdminSettings();
  const me = useAdminAuthStore((s) => s.admin);
  const [filter, setFilter] = useState<Filter>('active');
  const [query, setQuery] = useState('');
  const [now] = useState(() => Date.now());
  const { selected, open, close } = useSelection(tickets);
  const sla = settings?.supportSla ?? DEFAULT_SLA;

  if (isLoading || !tickets) return <PageLoader />;

  const memberName = new Map(team.map((m) => [m.id, `${m.firstName} ${m.lastName}`]));
  const filters: Record<Filter, { label: string; test: (t: Ticket) => boolean }> = {
    active: { label: 'En cours', test: isActive },
    mine: { label: 'Mes demandes', test: (t) => isActive(t) && t.assigneeId === me?.id },
    late: { label: 'En retard', test: (t) => isLate(t, now, sla) },
    unassigned: { label: 'Non attribuées', test: (t) => isActive(t) && !t.assigneeId },
    done: { label: 'Résolues et clôturées', test: (t) => !isActive(t) },
  };
  const rows = tickets.filter(
    (t) => filters[filter].test(t) && matches(query, t.number, t.name, t.subject, t.orderNumber),
  );
  const unassigned = tickets.filter(filters.unassigned.test);
  const rated = tickets.filter((t) => t.satisfaction);

  const columns: Column<Ticket>[] = [
    {
      key: 'subject',
      header: 'Demande',
      cell: (t) => (
        <>
          <span className="block font-semibold">{t.subject}</span>
          <span className="block text-xs text-ink-muted">
            {t.number} · {t.name}
            {t.orderNumber && ` · ${t.orderNumber}`}
          </span>
        </>
      ),
    },
    { key: 'category', header: 'Sujet', cell: (t) => <span className="capitalize">{t.category}</span> },
    {
      key: 'priority',
      header: 'Priorité',
      cell: (t) => (t.priority === 'high' ? <StateBadge tone="danger">Haute</StateBadge> : 'Normale'),
    },
    {
      key: 'assignee',
      header: 'Responsable',
      cell: (t) =>
        t.assigneeId ? (
          (memberName.get(t.assigneeId) ?? 'Membre supprimé')
        ) : (
          <span className="text-ink-muted">Non attribuée</span>
        ),
    },
    {
      key: 'due',
      header: 'Réponse attendue',
      cell: (t) => {
        const due = responseDue(t, sla);
        if (!due) return <span className="text-ink-muted">-</span>;
        return isLate(t, now, sla) ? (
          <StateBadge tone="danger">{`En retard depuis le ${formatDateTime(due)}`}</StateBadge>
        ) : (
          <span className="whitespace-nowrap">avant le {formatDateTime(due)}</span>
        );
      },
    },
    {
      key: 'status',
      header: 'Statut',
      cell: (t) => <StateBadge tone={tone[t.status]}>{statusLabel[t.status]}</StateBadge>,
    },
  ];

  return (
    <>
      <PageIntro>
        Chaque demande a un responsable et une échéance de réponse ({sla.high} h en priorité haute, {sla.normal} h
        sinon). Le client voit la réponse dans son espace « Assistance ».
      </PageIntro>
      <StatRow
        items={[
          { label: 'En cours', value: tickets.filter(isActive).length },
          { label: 'En retard', value: tickets.filter(filters.late.test).length },
          { label: 'Non attribuées', value: unassigned.length },
          {
            label: 'Satisfaction moyenne',
            value: rated.length
              ? `${(rated.reduce((s, t) => s + (t.satisfaction ?? 0), 0) / rated.length).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} / 5`
              : '-',
          },
        ]}
      />
      <Toolbar>
        <Segmented
          label="Filtre"
          value={filter}
          onChange={setFilter}
          options={(Object.keys(filters) as Filter[]).map((f) => ({
            value: f,
            label: filters[f].label,
            count: tickets.filter(filters[f].test).length,
          }))}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Numéro, client, commande" />
      </Toolbar>
      <AdminTable
        key={filter + query}
        caption="Demandes d’assistance"
        columns={columns}
        rows={rows}
        rowKey={(t) => t.id}
        onRowClick={open}
        empty="Aucune demande dans cette catégorie."
      />
      <TicketDrawer ticket={selected} onClose={close} />
    </>
  );
}

function TicketDrawer({ ticket, onClose }: { ticket: Ticket | null; onClose: () => void }) {
  const [reply, setReply] = useState('');
  const [closing, setClosing] = useState<TicketStatus | null>(null);
  const update = useAdminMutation(
    ({ intent }: { message: string; intent: () => Promise<unknown> }) => intent(),
    (v) => v.message,
  );

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!ticket || reply.trim().length < 2) return;
    update.mutate(
      {
        // La réponse est envoyée au client par e-mail et sur ses appareils ; la demande attend son retour
        intent: () => supportBackend.answer(ticket, reply.trim()),
        message: `Réponse envoyée : ${ticket.number}`,
      },
      { onSuccess: () => setReply('') },
    );
  };

  const changeStatus = (status: TicketStatus) => {
    if (!ticket) return;
    // Résoudre ou clôturer exige la solution retenue (15.2)
    if (status === 'resolved' || status === 'closed') return setClosing(status);
    update.mutate({
      message: `${ticket.number} : ${statusLabel[status]}`,
      intent: () => supportBackend.update(ticket, { status }),
    });
  };

  const { data: active = [] } = useTeamDirectory();

  return (
    <Drawer open={!!ticket} onClose={onClose} title={ticket?.subject ?? ''} className="sm:max-w-lg">
      {ticket && (
        <div className="flex min-h-full flex-col gap-5 p-5 text-sm">
          <p className="text-ink-soft">
            {ticket.name} · {ticket.email}
            {ticket.orderNumber && <span className="block">Commande {ticket.orderNumber}</span>}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Responsable"
              value={ticket.assigneeId ?? ''}
              onChange={(e) => {
                const m = active.find((x) => x.id === e.target.value);
                const assigneeId = e.target.value || null;
                update.mutate({
                  intent: () => supportBackend.update(ticket, { assigneeId }),
                  message: m
                    ? `${ticket.number} confiée à ${m.firstName} ${m.lastName}`
                    : `${ticket.number} sans responsable`,
                });
              }}
            >
              <option value="">Non attribuée</option>
              {active.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Statut"
              value={ticket.status}
              onChange={(e) => changeStatus(e.target.value as TicketStatus)}
            >
              {(Object.keys(statusLabel) as TicketStatus[]).map((s) => (
                <option key={s} value={s}>
                  {statusLabel[s]}
                </option>
              ))}
            </SelectField>
          </div>
          {ticket.closureReason && (
            <p className="rounded-md bg-forest-50 p-3 text-forest">
              <span className="font-semibold">Solution retenue : </span>
              {ticket.closureReason}
            </p>
          )}

          <ol className="space-y-3">
            {ticket.messages.map((m) => (
              <li
                key={m.id}
                className={cn(
                  'max-w-[85%] rounded-lg p-3',
                  m.from === 'support' ? 'ml-auto bg-forest text-white' : 'bg-ivory text-ink',
                )}
              >
                <p className="whitespace-pre-line">{m.body}</p>
                <AttachmentList items={m.attachments} tone={m.from === 'support' ? 'dark' : 'light'} />
                <p className={cn('mt-1 text-xs', m.from === 'support' ? 'text-white/70' : 'text-ink-muted')}>
                  {m.from === 'support' ? 'Équipe' : ticket.name} · {formatDateTime(m.at)}
                </p>
              </li>
            ))}
          </ol>

          {ticket.status !== 'closed' && (
            <form onSubmit={send} className="mt-auto space-y-3 border-t border-sage pt-4">
              <TextAreaField label="Votre réponse" rows={4} value={reply} onChange={(e) => setReply(e.target.value)} />
              <Button type="submit" className="w-full" disabled={reply.trim().length < 2} loading={update.isPending}>
                Envoyer la réponse
              </Button>
            </form>
          )}
          <p className="text-xs text-ink-muted">
            Côté client, ce statut s’affiche « {ticketStatusLabel[ticket.status]} ».
          </p>
        </div>
      )}
      {ticket && (
        <ReasonDialog
          open={!!closing}
          onClose={() => setClosing(null)}
          title={closing === 'closed' ? 'Clôturer la demande' : 'Marquer comme résolue'}
          description="La solution retenue est conservée dans le dossier et communiquée au client."
          label="Solution retenue ou motif de clôture"
          confirmLabel={closing === 'closed' ? 'Clôturer' : 'Marquer résolue'}
          loading={update.isPending}
          onConfirm={(reason) =>
            update.mutate(
              {
                intent: () => supportBackend.update(ticket, { status: closing!, closureReason: reason }),
                message: `${ticket.number} : ${statusLabel[closing!]}`,
              },
              { onSuccess: () => setClosing(null) },
            )
          }
        />
      )}
    </Drawer>
  );
}
