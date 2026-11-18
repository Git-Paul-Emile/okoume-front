/**
 * Règles de l'assistant d'administration (17.5, 17.8) : paramètres versionnés, et décisions humaines
 * sur ses propositions (acceptation, refus motivé, report), avec reconfirmation si l'exécution tarde.
 */
export interface AssistantParams {
  /** Jours sans vente avant de proposer une remise. */
  slowDays: number;
  /** Remise proposée, en %. */
  slowDiscount: number;
  /** Durée de la remise proposée, en jours. */
  promoDays: number;
  /** Stock disponible minimum pour proposer une remise. */
  minStock: number;
}

export const DEFAULT_PARAMS: AssistantParams = { slowDays: 60, slowDiscount: 10, promoDays: 30, minStock: 10 };

export interface RulesVersion {
  id: string;
  version: number;
  params: AssistantParams;
  note: string;
  by: string;
  at: string;
}

export function paramsError(p: AssistantParams): string | null {
  if (!Number.isInteger(p.slowDays) || p.slowDays < 14 || p.slowDays > 365)
    return 'Jours sans vente : entre 14 et 365.';
  if (!Number.isInteger(p.slowDiscount) || p.slowDiscount < 5 || p.slowDiscount > 50)
    return 'Remise : entre 5 et 50 %.';
  if (!Number.isInteger(p.promoDays) || p.promoDays < 7 || p.promoDays > 90) return 'Durée : entre 7 et 90 jours.';
  if (!Number.isInteger(p.minStock) || p.minStock < 1) return 'Stock minimum : au moins 1.';
  return null;
}

/** Version en vigueur : la plus récente ; à défaut, les paramètres d'origine. */
export const activeParams = (versions: RulesVersion[]) =>
  [...versions].sort((a, b) => b.version - a.version)[0]?.params ?? DEFAULT_PARAMS;

/** Nouvelle version (une restauration crée aussi une version, l'historique n'est jamais réécrit). */
export const nextVersion = (
  versions: RulesVersion[],
  params: AssistantParams,
  note: string,
  by: string,
  id: string,
): RulesVersion => ({
  id,
  version: Math.max(0, ...versions.map((v) => v.version)) + 1,
  params,
  note,
  by,
  at: new Date().toISOString(),
});

export type Decision = 'accepted' | 'refused' | 'postponed' | 'executed';

export interface ProposalDecision {
  id: string;
  proposalId: string;
  decision: Decision;
  reason?: string;
  /** Report : la proposition revient à cette date. */
  until?: string;
  by: string;
  at: string;
}

/** Délai après lequel une acceptation non exécutée doit être reconfirmée. */
export const STALE_HOURS = 24;
const REFUSAL_DAYS = 30;

export type ProposalStatus = 'new' | 'accepted' | 'stale' | 'postponed' | 'refused' | 'executed';

/** État d'une proposition d'après la dernière décision. */
export function proposalStatus(proposalId: string, decisions: ProposalDecision[], now = Date.now()): ProposalStatus {
  const last = decisions.filter((d) => d.proposalId === proposalId).sort((a, b) => b.at.localeCompare(a.at))[0];
  if (!last) return 'new';
  const age = now - new Date(last.at).getTime();
  if (last.decision === 'postponed') return last.until && new Date(last.until).getTime() > now ? 'postponed' : 'new';
  if (last.decision === 'refused') return age < REFUSAL_DAYS * 86_400_000 ? 'refused' : 'new';
  // Exécutée : la proposition peut revenir le lendemain si la situation persiste (par exemple après annulation)
  if (last.decision === 'executed') return age < 86_400_000 ? 'executed' : 'new';
  return age > STALE_HOURS * 3_600_000 ? 'stale' : 'accepted';
}

export function decisionError(decision: Decision, reason: string, until?: string, now = Date.now()) {
  if (decision === 'refused' && reason.trim().length < 5) return 'Le refus nécessite un motif.';
  if (decision === 'postponed' && (!until || new Date(until).getTime() <= now))
    return 'Choisissez une date de rappel future.';
  return null;
}

export const URGENCY_ORDER = { haute: 0, moyenne: 1, faible: 2 } as const;
