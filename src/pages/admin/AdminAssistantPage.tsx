import { AnimatePresence, motion } from 'motion/react';
import { CircleCheck, Info, OctagonAlert, Send, TriangleAlert, Undo2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { adminApi } from '@/features/admin/admin.api';
import { canAccess } from '@/features/admin/admin.navigation';
import {
  useAdminMutation,
  useAdminOrders,
  useAdminProducts,
  useAdminSettings,
  useAdminTickets,
  useAssistantActions,
  useAssistantRules,
  useProposalDecisions,
  useSiteStats,
} from '@/features/admin/admin.queries';
import {
  anomalies,
  answer,
  dailySummary,
  proposals,
  SUGGESTED_QUESTIONS,
  type Answer,
  type AssistantContext,
} from '@/features/admin/adminAssistant';
import { activeParams } from '@/features/admin/assistantRules';
import {
  AssistantJournal,
  AssistantRulesPanel,
  ProposalsSection,
} from '@/features/admin/components/AssistantProposals';
import { logEntry } from '@/features/admin/assistantLog';
import { useQueryClient } from '@tanstack/react-query';
import { isOwner } from '@/features/admin/permissions';
import { formatPercent } from '@/features/admin/chart.utils';
import { DashboardCard } from '@/features/admin/components/DashboardCard';
import { PageIntro } from '@/features/admin/components/Toolbar';
import { referenceEnd } from '@/features/admin/dashboard.utils';
import { stagger } from '@/lib/motion';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { formatDate, formatDateTime } from '@/utils/formatDate';
import { cn } from '@/utils/text';

const levelIcon = {
  critical: { icon: OctagonAlert, className: 'text-danger', label: 'Critique' },
  warning: { icon: TriangleAlert, className: 'text-warning', label: 'Avertissement' },
  info: { icon: Info, className: 'text-ink-muted', label: 'Information' },
};

/** Assistant de l'administration (17) : résumé du jour, points d'attention, propositions à valider et questions. */
export default function AdminAssistantPage() {
  const admin = useAdminAuthStore((s) => s.admin);
  const orders = useAdminOrders();
  const { data: products = [] } = useAdminProducts();
  const { data: tickets = [] } = useAdminTickets();
  const { data: stats = [] } = useSiteStats();
  const { data: settings } = useAdminSettings();
  const { data: actions = [] } = useAssistantActions();
  const { data: decisions = [] } = useProposalDecisions();
  const { data: rulesVersions = [] } = useAssistantRules();
  const revert = useAdminMutation(
    (a: (typeof actions)[number]) => adminApi.revertProposal(a),
    (a) => `Proposition annulée : ${a.title}`,
  );

  const ctx = useMemo<AssistantContext | null>(
    () =>
      orders.data
        ? {
            orders: orders.data,
            products,
            tickets,
            stats,
            end: referenceEnd(orders.data, stats),
            sla: settings?.supportSla,
          }
        : null,
    [orders.data, products, tickets, stats, settings],
  );

  if (!ctx) return <PageLoader />;

  const summary = dailySummary(ctx);
  const findings = anomalies(ctx);
  // Propositions sur le catalogue : réservées aux rôles qui ont accès aux produits (17.7)
  const canEdit = !!admin && canAccess(admin, '/admin/produits');
  const proposed = canEdit ? proposals(ctx, activeParams(rulesVersions)) : [];

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageIntro>
        Les chiffres viennent directement des données de la boutique ; l’assistant les interprète et ne modifie rien
        sans votre validation. Chaque modification appliquée peut être annulée.
      </PageIntro>

      <motion.div
        variants={stagger(0.08)}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 xl:grid-cols-2"
      >
        <DashboardCard
          title={`Résumé du ${formatDate(summary.day.toISOString())}`}
          description="Comparé au même jour de la semaine précédente"
        >
          {summary.insufficient ? (
            <p className="text-sm text-ink-soft">
              Données insuffisantes : aucune commande ni visite enregistrée ce jour-là.
            </p>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-3">
                {summary.lines.map((l) => (
                  <div key={l.label} className="rounded-lg border border-sage p-3">
                    <dt className="text-xs text-ink-muted">{l.label}</dt>
                    <dd className="mt-0.5 text-lg font-extrabold tabular-nums">{l.value}</dd>
                    {l.change !== null && (
                      <dd className={cn('text-xs font-semibold', l.change >= 0 ? 'text-forest' : 'text-danger')}>
                        {l.change >= 0 ? '+' : '−'}
                        {formatPercent(Math.abs(l.change), 0)}
                      </dd>
                    )}
                  </div>
                ))}
              </dl>
              <ul className="mt-4 space-y-1.5 text-sm text-ink-soft">
                {summary.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
                <li className={findings.length ? 'font-semibold text-warning' : 'font-semibold text-forest'}>
                  {findings.length
                    ? `${findings.length} point${findings.length > 1 ? 's' : ''} d’attention ci-contre.`
                    : 'Aucune anomalie importante détectée.'}
                </li>
              </ul>
            </>
          )}
        </DashboardCard>

        <DashboardCard
          title="Points d’attention"
          description="Classés par urgence, avec les données qui les justifient"
        >
          {findings.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-forest">
              <CircleCheck className="size-5" aria-hidden="true" />
              Rien d’anormal pour l’instant.
            </p>
          ) : (
            <ul className="space-y-4">
              {findings.map((f) => {
                const level = levelIcon[f.level];
                return (
                  <li key={f.id} className="flex gap-3">
                    <level.icon className={cn('mt-0.5 size-5 shrink-0', level.className)} aria-hidden="true" />
                    <div className="min-w-0 text-sm">
                      <p className="font-semibold text-ink">
                        {f.title} <span className={cn('text-xs', level.className)}>{level.label}</span>
                      </p>
                      <p className="mt-0.5 text-ink-soft">{f.evidence}</p>
                      <p className="mt-0.5 text-ink-muted">{f.advice}</p>
                      <Link to={f.to} className="mt-1 inline-block font-semibold text-forest hover:underline">
                        Traiter
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </DashboardCard>
      </motion.div>

      {canEdit && (
        <section className="mt-6">
          <ProposalsSection proposals={proposed} decisions={decisions} />
          {actions.length > 0 && (
            <div className="card mt-4 p-5">
              <h3 className="mb-3 text-base">Propositions appliquées</h3>
              <ul className="divide-y divide-sage text-sm">
                {actions.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                    <span>
                      <span className="block font-medium">{a.title}</span>
                      <span className="block text-xs text-ink-muted">
                        {a.changes.length} produit{a.changes.length > 1 ? 's' : ''} · par {a.appliedBy}, le{' '}
                        {formatDateTime(a.appliedAt)}
                        {a.revertedAt && ` · annulée le ${formatDateTime(a.revertedAt)}`}
                      </span>
                    </span>
                    {!a.revertedAt && (
                      <Button
                        size="sm"
                        variant="outline"
                        icon={<Undo2 className="size-4" />}
                        loading={revert.isPending}
                        onClick={() => revert.mutate(a)}
                      >
                        Annuler
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <AskPanel ctx={ctx} />

      {isOwner(admin) && <AssistantRulesPanel versions={rulesVersions} />}
      {isOwner(admin) && <AssistantJournal decisions={decisions} actions={actions} />}

      <p className="mt-4 text-xs text-ink-muted">
        Assistant à règles fonctionnant dans le navigateur : aucune donnée n’est envoyée à un service extérieur. Il
        pourra être remplacé par un modèle d’IA côté serveur, avec les mêmes garanties (calculs faits sur les données,
        aucune modification sans validation).
      </p>
    </div>
  );
}

function AskPanel({ ctx }: { ctx: AssistantContext }) {
  const [question, setQuestion] = useState('');
  const [thread, setThread] = useState<Array<{ q: string; a: Answer }>>([]);

  const admin = useAdminAuthStore((s) => s.admin);
  const qc = useQueryClient();
  const ask = (q: string) => {
    if (!q.trim()) return;
    const a = answer(q, ctx);
    setThread((t) => [...t, { q: q.trim(), a }]);
    setQuestion('');
    // Journal (17.7) : question, réponse et source, coordonnées masquées
    void adminApi
      .logAssistant(logEntry(q, a, admin ? `${admin.firstName} ${admin.lastName}` : 'Équipe', crypto.randomUUID()))
      .then(() => qc.invalidateQueries({ queryKey: ['admin', 'assistantLog'] }))
      .catch(() => undefined);
  };

  return (
    <section className="card mt-6 p-5 sm:p-6">
      <h2 className="text-base">Poser une question</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Ventes, marge, stock, paiements, annulations, quartiers, assistance.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => ask(s)}
            className="rounded-md border border-sage-dark px-3 py-1.5 text-sm hover:border-forest hover:text-forest"
          >
            {s}
          </button>
        ))}
      </div>
      <ol className="mt-5 space-y-4" aria-live="polite">
        <AnimatePresence initial={false}>
          {thread.map((t, i) => (
            <motion.li key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
              <p className="ml-auto w-fit max-w-[85%] rounded-lg bg-forest px-4 py-2.5 text-sm text-white">{t.q}</p>
              <div className="max-w-[85%] rounded-lg bg-ivory px-4 py-3 text-sm">
                <p className="text-ink">{t.a.text}</p>
                {t.a.bullets && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
                    {t.a.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                )}
                {t.a.link && (
                  <Link to={t.a.link.to} className="mt-2 inline-block font-semibold text-forest hover:underline">
                    {t.a.link.label}
                  </Link>
                )}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <label htmlFor="assistant-question" className="sr-only">
          Votre question
        </label>
        <input
          id="assistant-question"
          className="input h-11 flex-1"
          placeholder="Ex. Quelle est notre marge ce mois-ci ?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <Button type="submit" icon={<Send className="size-4" />} disabled={!question.trim()}>
          Demander
        </Button>
      </form>
    </section>
  );
}
