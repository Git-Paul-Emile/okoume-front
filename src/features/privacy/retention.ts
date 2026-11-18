/**
 * Durées de conservation (19.5). Elles sont fixées par la boutique et ne se configurent pas
 * depuis l'administration. L'API les applique par un traitement planifié ; le front les affiche
 * et applique celles qui concernent le navigateur (panier, archives visibles dans le compte).
 */
const DAY = 86_400_000;
const MONTH = 30.44 * DAY;

export type RetentionCategory =
  'inactiveAccounts' | 'accounting' | 'abandonedCarts' | 'browsing' | 'connectionLogs' | 'customerService';

export interface RetentionRule {
  category: RetentionCategory;
  label: string;
  duration: string;
  /** Durée en millisecondes. */
  ms: number;
  /** Ce qui arrive à l'échéance. */
  outcome: string;
}

export const RETENTION_RULES: readonly RetentionRule[] = [
  {
    category: 'inactiveAccounts',
    label: 'Comptes clients inactifs',
    duration: '3 ans',
    ms: 36 * MONTH,
    outcome: 'Compte anonymisé après 3 ans sans connexion ni commande.',
  },
  {
    category: 'accounting',
    label: 'Documents comptables (factures, avoirs)',
    duration: '10 ans',
    ms: 120 * MONTH,
    outcome: 'Archivés à part des données du compte, accès réservé à la boutique, supprimés au terme des 10 ans.',
  },
  {
    category: 'abandonedCarts',
    label: 'Paniers abandonnés',
    duration: '30 jours',
    ms: 30 * DAY,
    outcome: 'Panier vidé 30 jours après sa dernière modification.',
  },
  {
    category: 'browsing',
    label: 'Historique de navigation',
    duration: '13 mois',
    ms: 13 * MONTH,
    outcome: 'Consultations, recherches et produits vus supprimés après 13 mois.',
  },
  {
    category: 'connectionLogs',
    label: 'Journaux de connexion',
    duration: '12 mois',
    ms: 12 * MONTH,
    outcome: 'Traces de connexion supprimées après 12 mois.',
  },
  {
    category: 'customerService',
    label: 'Service client et prospection',
    duration: '3 ans',
    ms: 36 * MONTH,
    outcome: 'Demandes d’assistance, messages et demandes de quartier supprimés 3 ans après le dernier échange.',
  },
];

const ruleMs = (category: RetentionCategory) => RETENTION_RULES.find((r) => r.category === category)!.ms;

/** La donnée datée de `at` a dépassé sa durée de conservation. */
export const expired = (category: RetentionCategory, at: string | number | null | undefined, now: number) =>
  at !== null && at !== undefined && now - new Date(at).getTime() > ruleMs(category);

/**
 * Fenêtre opérationnelle du compte client : les commandes et factures plus anciennes ne sont plus
 * affichées dans le compte. Les factures restent dans les archives comptables, séparées (10 ans).
 */
export const OPERATIONAL_MS = ruleMs('customerService');

export const visibleInAccount = (createdAt: string, now: number) =>
  now - new Date(createdAt).getTime() <= OPERATIONAL_MS;

/** Dernière activité d'un client : création du compte, dernière connexion ou dernière commande. */
export function lastActivity(user: { createdAt: string; lastLoginAt?: string }, orderDates: string[]) {
  return [user.createdAt, user.lastLoginAt, ...orderDates]
    .filter((d): d is string => !!d)
    .reduce((max, d) => (d > max ? d : max), user.createdAt);
}
