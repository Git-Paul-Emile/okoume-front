import { z } from 'zod';
import { backend } from '@/api/backend';
import { adminCatalogBackend } from './adminCatalog.backend';
import type { Id } from '@/api/types';
import type { AdminProduct, AssistantAction } from './admin.types';
import type { AssistantLogEntry } from './assistantLog';
import type { ProposalDecision, RulesVersion } from './assistantRules';

/**
 * Assistant d'administration sur l'API (api/src/features/staff-assistant). L'analyse tourne dans l'interface sur
 * les données de l'API ; le serveur garde décisions, propositions appliquées, règles et questions, avec l'auteur
 * réel. Les produits sont modifiés par les routes du catalogue, avec leurs droits.
 */

const patchDto = z.object({
  featured: z.boolean().optional(),
  promotion: z
    .object({ type: z.enum(['percent', 'fixed']), value: z.number(), startsAt: z.string(), endsAt: z.string() })
    .nullable()
    .optional(),
});

const actionDto = z
  .object({
    id: z.string(),
    proposalId: z.string(),
    title: z.string(),
    changes: z.array(z.object({ productId: z.string(), label: z.string(), before: patchDto, after: patchDto })),
    appliedByName: z.string(),
    appliedAt: z.string(),
    revertedAt: z.string().nullable(),
    revertedByName: z.string().nullable(),
  })
  .transform((a): AssistantAction => ({
    id: a.id,
    proposalId: a.proposalId,
    title: a.title,
    changes: a.changes,
    appliedAt: a.appliedAt,
    appliedBy: a.appliedByName,
    revertedAt: a.revertedAt,
    ...(a.revertedByName ? { revertedBy: a.revertedByName } : {}),
  }));

const decisionDto = z
  .object({
    id: z.string(),
    proposalId: z.string(),
    decision: z.enum(['accepted', 'refused', 'postponed', 'executed']),
    reason: z.string().nullable(),
    until: z.string().nullable(),
    staffName: z.string(),
    createdAt: z.string(),
  })
  .transform((d): ProposalDecision => ({
    id: d.id,
    proposalId: d.proposalId,
    decision: d.decision,
    ...(d.reason ? { reason: d.reason } : {}),
    ...(d.until ? { until: d.until } : {}),
    by: d.staffName,
    at: d.createdAt,
  }));

const versionDto = z
  .object({
    id: z.string(),
    version: z.number(),
    params: z.object({ slowDays: z.number(), slowDiscount: z.number(), promoDays: z.number(), minStock: z.number() }),
    note: z.string(),
    staffName: z.string(),
    createdAt: z.string(),
  })
  .transform((v): RulesVersion => ({
    id: v.id,
    version: v.version,
    params: v.params,
    note: v.note,
    by: v.staffName,
    at: v.createdAt,
  }));

const questionDto = z
  .object({
    id: z.string(),
    question: z.string(),
    answer: z.string(),
    source: z.string(),
    staffName: z.string(),
    createdAt: z.string(),
  })
  .transform((q): AssistantLogEntry => ({
    id: q.id,
    at: q.createdAt,
    by: q.staffName,
    question: q.question,
    answer: q.answer,
    source: q.source,
  }));

/** Modification d'un produit : la route du catalogue par défaut, remplaçable dans les tests. */
type ProductUpdater = (id: Id, patch: Partial<AdminProduct>) => Promise<unknown>;

const overviewDto = z.object({
  decisions: z.array(decisionDto),
  actions: z.array(actionDto),
  rules: z.array(versionDto),
});

const overview = async (signal?: AbortSignal) =>
  overviewDto.parse(await backend.get('/staff/assistant', undefined, signal));

export const adminAssistantBackend = {
  actions: async (signal?: AbortSignal) => (await overview(signal)).actions,
  decisions: async (signal?: AbortSignal) => (await overview(signal)).decisions,
  rules: async (signal?: AbortSignal) => (await overview(signal)).rules,
  questions: async (signal?: AbortSignal) =>
    z.array(questionDto).parse(await backend.get('/staff/assistant/questions', undefined, signal)),

  decide: async (d: Omit<ProposalDecision, 'id' | 'at' | 'by'>) =>
    decisionDto.parse(
      await backend.post('/staff/assistant/decisions', {
        proposalId: d.proposalId,
        decision: d.decision,
        ...(d.reason ? { reason: d.reason } : {}),
        ...(d.until ? { until: d.until } : {}),
      }),
    ),

  saveRules: async (v: Pick<RulesVersion, 'params' | 'note'>) =>
    versionDto.parse(await backend.post('/staff/assistant/rules', { params: v.params, note: v.note })),

  logQuestion: async (entry: Pick<AssistantLogEntry, 'question' | 'answer' | 'source'>) =>
    questionDto.parse(
      await backend.post('/staff/assistant/questions', {
        question: entry.question,
        answer: entry.answer,
        source: entry.source,
      }),
    ),

  /** Chaque produit passe par la route du catalogue ; la proposition n'est inscrite qu'une fois tout appliqué. */
  async apply(
    action: Pick<AssistantAction, 'proposalId' | 'title' | 'changes'>,
    updateProduct: ProductUpdater = adminCatalogBackend.updateProduct,
  ) {
    for (const c of action.changes) await updateProduct(c.productId, c.after);
    return actionDto.parse(
      await backend.post('/staff/assistant/actions', {
        proposalId: action.proposalId,
        title: action.title,
        changes: action.changes.map((c) => ({
          productId: c.productId,
          label: c.label,
          before: pick(c.before),
          after: pick(c.after),
        })),
      }),
    );
  },

  async revert(action: AssistantAction, updateProduct: ProductUpdater = adminCatalogBackend.updateProduct) {
    for (const c of action.changes) await updateProduct(c.productId, c.before);
    return actionDto.parse(await backend.post(`/staff/assistant/actions/${action.id}/reversions`));
  },
};

/** Seuls « mis en avant » et la promotion sont modifiés par une proposition. */
function pick(patch: AssistantAction['changes'][number]['before']) {
  return {
    ...(patch.featured !== undefined ? { featured: patch.featured } : {}),
    ...(patch.promotion !== undefined ? { promotion: patch.promotion } : {}),
  };
}
