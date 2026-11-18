import type { AlertLevel } from './dashboard.utils';

export type AlertState = 'new' | 'in_progress' | 'resolved' | 'closed';

export const alertStateLabel: Record<AlertState, string> = {
  new: 'Nouvelle',
  in_progress: 'En cours',
  resolved: 'Résolue',
  closed: 'Clôturée',
};

/** Canaux par niveau (17.6) : l'envoi des e-mails et des notifications push est fait par l'API. */
export const alertChannels: Record<AlertLevel, string> = {
  info: 'Tableau de bord',
  warning: 'Tableau de bord et e-mail',
  critical: 'Notification prioritaire et push',
};

/** Situation détectée par le serveur : une clé stable par problème, pour regrouper ses répétitions. */
interface DetectedAlert {
  key: string;
  level: AlertLevel;
  title: string;
  detail: string;
  /** Écran où traiter le problème. */
  to: string;
}

export interface AlertRecord extends DetectedAlert {
  id: string;
  state: AlertState;
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
  /** La situation n'est plus détectée : à résoudre ou clôturer par un humain. */
  cleared: boolean;
  assigneeId?: string | null;
  closureReason?: string;
  actionTaken?: string;
  episodes: Array<{ openedAt: string; resolvedAt?: string }>;
  /** Dernier rappel envoyé tant que le problème persiste (7.7). */
  lastReminderAt?: string;
  history: Array<{ at: string; by: string; event: string }>;
}

/** Une alerte critique non prise en charge dans le délai est relancée et remontée (escalade). */
export const isEscalated = (a: AlertRecord, now: number, hours: number) =>
  a.level === 'critical' &&
  a.state === 'new' &&
  now - new Date(a.lastSeenAt).getTime() >= 0 &&
  now - new Date(a.episodes.at(-1)?.openedAt ?? a.firstSeenAt).getTime() > hours * 3_600_000;

/** Clôture : justification obligatoire ; pour une alerte critique, action effectuée ou motif d'absence d'action. */
export function closureError(a: Pick<AlertRecord, 'level'>, reason: string, action: string): string | null {
  if (reason.trim().length < 5) return 'Indiquez la justification de la clôture.';
  if (a.level === 'critical' && action.trim().length < 5)
    return 'Alerte critique : décrivez l’action effectuée, ou pourquoi aucune action n’était nécessaire.';
  return null;
}
