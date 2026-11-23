import { Lightbulb } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { formatDateTime } from '@/utils/formatDate';
import { cn } from '@/utils/text';
import { adminApi } from '../admin.api';
import { useAdminMutation, useAssistantLog } from '../admin.queries';
import type { Proposal } from '../adminAssistant';
import {
  decisionError,
  proposalStatus,
  STALE_HOURS,
  type ProposalDecision,
} from '../assistantRules';
import { ReasonDialog } from './ReasonDialog';

const urgencyClass = { haute: 'text-danger', moyenne: 'text-warning', faible: 'text-ink-muted' };

/**
 * Cycle d'une proposition (17.5) : consultation, acceptation, refus motivé ou report, puis exécution.
 * Une acceptation non exécutée sous STALE_HOURS heures doit être reconfirmée.
 */
export function ProposalsSection({ proposals, decisions }: { proposals: Proposal[]; decisions: ProposalDecision[] }) {
  const admin = useAdminAuthStore((s) => s.admin);
  const by = admin ? `${admin.firstName} ${admin.lastName}` : 'Équipe';
  const [now] = useState(() => Date.now());
  const [refusing, setRefusing] = useState<Proposal | null>(null);
  const [postponing, setPostponing] = useState<Proposal | null>(null);
  const [executing, setExecuting] = useState<{ p: Proposal; stale: boolean } | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  const decide = useAdminMutation(
    (d: { p: Proposal; decision: ProposalDecision['decision']; reason?: string; until?: string }) =>
      adminApi.decideProposal({ proposalId: d.p.id, decision: d.decision, reason: d.reason, until: d.until, by }),
    (d) =>
      ({
        accepted: `Proposition acceptée : ${d.p.title}`,
        refused: `Proposition refusée : ${d.p.title} (${d.reason})`,
        postponed: `Proposition reportée : ${d.p.title}`,
        executed: `Proposition exécutée : ${d.p.title}`,
      })[d.decision],
  );
  const execute = useAdminMutation(
    async (p: Proposal) => {
      await adminApi.applyProposal({ proposalId: p.id, title: p.title, changes: p.changes, appliedBy: by });
      await adminApi.decideProposal({ proposalId: p.id, decision: 'executed', by });
    },
    (p) => `Proposition de l’assistant exécutée : ${p.title} (${p.changes.length} produit(s))`,
  );

  const withStatus = proposals.map((p) => ({ p, status: proposalStatus(p.id, decisions, now) }));
  const open = withStatus.filter((x) => ['new', 'accepted', 'stale'].includes(x.status));
  const closed = withStatus.filter((x) => ['refused', 'postponed'].includes(x.status));
  const lastOf = (id: string) => decisions.find((d) => d.proposalId === id);

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-lg">Propositions à valider</h2>
      {open.length === 0 ? (
        <p className="card p-5 text-sm text-ink-soft">Aucune proposition en attente.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {open.map(({ p, status }) => (
            <article key={p.id} className="card flex flex-col p-5">
              <h3 className="flex items-start gap-2 text-base">
                <Lightbulb className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
                {p.title}
              </h3>
              <p className={cn('mt-1 text-xs font-semibold', urgencyClass[p.urgency])}>Urgence {p.urgency}</p>
              <p className="mt-2 text-sm text-ink-soft">{p.reason}</p>
              <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                {p.evidence.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
              <dl className="mt-3 space-y-1 text-sm">
                {(
                  [
                    ['Période analysée', p.period],
                    ['Impact estimé', p.impact],
                    ['Bénéfice attendu', p.benefit],
                    ['Risque', p.risk],
                    ['Limites', p.limits],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k}>
                    <dt className="inline font-semibold">{k} : </dt>
                    <dd className="inline text-ink-soft">{v}</dd>
                  </div>
                ))}
              </dl>
              {status !== 'new' && (
                <p className={cn('mt-3 text-xs', status === 'stale' ? 'font-semibold text-warning' : 'text-ink-muted')}>
                  Acceptée par {lastOf(p.id)?.by} le {formatDateTime(lastOf(p.id)!.at)}
                  {status === 'stale' && ` : non exécutée depuis plus de ${STALE_HOURS} h, à reconfirmer`}
                </p>
              )}
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                {status === 'new' ? (
                  <Button
                    size="sm"
                    loading={decide.isPending}
                    onClick={() => decide.mutate({ p, decision: 'accepted' })}
                  >
                    Accepter
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setExecuting({ p, stale: status === 'stale' })}>
                    {status === 'stale' ? 'Reconfirmer et exécuter' : 'Exécuter'}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setPostponing(p)}>
                  Reporter
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setRefusing(p)}>
                  Refuser
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      {closed.length > 0 && (
        <div className="mt-3 text-sm">
          <button
            type="button"
            className="font-semibold text-forest hover:underline"
            onClick={() => setShowClosed((v) => !v)}
          >
            {showClosed ? 'Masquer' : 'Voir'} les propositions refusées ou reportées ({closed.length})
          </button>
          {showClosed && (
            <ul className="mt-2 space-y-1 text-ink-soft">
              {closed.map(({ p, status }) => {
                const last = lastOf(p.id)!;
                return (
                  <li key={p.id}>
                    {p.title} :{' '}
                    {status === 'refused'
                      ? `refusée par ${last.by} (${last.reason})`
                      : `reportée au ${formatDateTime(last.until!)} par ${last.by}`}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <ReasonDialog
        open={!!refusing}
        onClose={() => setRefusing(null)}
        title="Refuser la proposition"
        description="Le motif est conservé avec la décision ; la proposition ne revient pas avant 30 jours."
        confirmLabel="Refuser"
        danger
        loading={decide.isPending}
        onConfirm={(reason) =>
          refusing &&
          decide.mutate({ p: refusing, decision: 'refused', reason }, { onSuccess: () => setRefusing(null) })
        }
      />
      {postponing && (
        <PostponeDialog
          loading={decide.isPending}
          onClose={() => setPostponing(null)}
          onConfirm={(until, reason) =>
            decide.mutate(
              { p: postponing, decision: 'postponed', until, reason },
              { onSuccess: () => setPostponing(null) },
            )
          }
        />
      )}
      {executing && (
        <ConfirmDialog
          open
          title={executing.stale ? 'Cette proposition est-elle toujours pertinente ?' : executing.p.title}
          description={`${
            executing.stale
              ? `Acceptée il y a plus de ${STALE_HOURS} h : vérifiez que les données ci-dessus sont toujours d’actualité. `
              : ''
          }${executing.p.changes.length} produit(s) concerné(s) : ${executing.p.changes.map((c) => c.label).join(', ')}. Vous pourrez annuler ensuite.`}
          confirmLabel={executing.stale ? 'Reconfirmer et exécuter' : 'Exécuter'}
          loading={execute.isPending}
          onConfirm={() => execute.mutate(executing.p, { onSuccess: () => setExecuting(null) })}
          onClose={() => setExecuting(null)}
        />
      )}
    </section>
  );
}

function PostponeDialog({
  loading,
  onClose,
  onConfirm,
}: {
  loading: boolean;
  onClose: () => void;
  onConfirm: (until: string, reason: string) => void;
}) {
  const [date, setDate] = useState(() => new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    const until = new Date(`${date}T08:00:00`).toISOString();
    const e = decisionError('postponed', reason, until);
    if (e) return setError(e);
    onConfirm(until, reason.trim());
  };
  return (
    <Modal open onClose={onClose} title="Reporter la proposition" description="Elle reviendra à la date choisie.">
      <div className="space-y-4">
        <TextField label="Revoir le" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <TextField label="Motif" optional value={reason} onChange={(e) => setReason(e.target.value)} />
        {error && (
          <p className="text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button loading={loading} onClick={submit}>
            Reporter
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Journal de l'assistant (17.7) : questions et réponses, décisions humaines et actions exécutées.
 * Historique détaillé réservé à l'administrateur principal ; coordonnées masquées à l'enregistrement.
 */
export function AssistantJournal({
  decisions,
  actions,
}: {
  decisions: ProposalDecision[];
  actions: Array<{
    id: string;
    title: string;
    appliedAt: string;
    appliedBy: string;
    revertedAt: string | null;
    revertedBy?: string;
  }>;
}) {
  const { data: log = [] } = useAssistantLog();
  const [open, setOpen] = useState(false);
  const label = { accepted: 'Acceptée', refused: 'Refusée', postponed: 'Reportée', executed: 'Exécutée' } as const;
  const entries = [
    ...log.map((l) => ({
      at: l.at,
      by: l.by,
      what: `Question : ${l.question}`,
      detail: `${l.answer} (source : ${l.source})`,
    })),
    ...decisions.map((d) => ({
      at: d.at,
      by: d.by,
      what: `Proposition ${label[d.decision].toLowerCase()} : ${d.proposalId}`,
      detail: d.reason ?? (d.until ? `jusqu’au ${formatDateTime(d.until)}` : ''),
    })),
    ...actions.flatMap((a) => [
      { at: a.appliedAt, by: a.appliedBy, what: `Action exécutée : ${a.title}`, detail: '' },
      ...(a.revertedAt
        ? [{ at: a.revertedAt, by: a.revertedBy ?? '', what: `Action annulée : ${a.title}`, detail: '' }]
        : []),
    ]),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <section className="card mt-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base">Journal de l’assistant</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {entries.length} entrée(s) : questions, décisions et actions. Réservé à l’administrateur principal.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          {open ? 'Masquer le journal' : 'Afficher le journal'}
        </Button>
      </div>
      {open && (
        <ol className="mt-4 max-h-96 space-y-2 overflow-y-auto text-sm">
          {entries.length === 0 && <li className="text-ink-muted">Aucune entrée pour le moment.</li>}
          {entries.map((e, i) => (
            <li key={i} className="rounded-md bg-ivory px-3 py-2">
              <p className="font-medium">{e.what}</p>
              {e.detail && <p className="text-ink-soft">{e.detail}</p>}
              <p className="text-xs text-ink-muted">
                {formatDateTime(e.at)}
                {e.by && ` · ${e.by}`}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
