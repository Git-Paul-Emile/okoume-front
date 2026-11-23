import type { Domain, Grantee } from './permissions';

/** Domaine de chaque alerte (17.6) : il désigne les personnes qui la reçoivent et la traitent. */
const DOMAIN_OF: Record<string, Domain> = {
  payments: 'paiements',
  review: 'commandes',
  waiting: 'commandes',
  prepare: 'commandes',
  cancel: 'retours',
  returns: 'retours',
  out: 'stock',
  low: 'stock',
  'anomaly-bestsellers-stock': 'stock',
  'emails-failed': 'clients',
  'anomaly-cancellations': 'commandes',
  'anomaly-revenue-drop': 'pilotage',
};

export const alertDomain = (key: string): Domain => DOMAIN_OF[key] ?? 'pilotage';

/** Toutes les alertes sont destinées à l'ensemble de l'équipe administratrice. */
export const isRecipient = (who: Grantee | null | undefined, _key: string) => !!who;

export const recipientRoles = (_key: string): string[] => ['Administrateurs'];
