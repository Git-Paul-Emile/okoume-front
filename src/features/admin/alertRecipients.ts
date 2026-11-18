import { adminRoleLabel } from './admin.navigation';
import type { AdminRole } from './admin.types';
import { can, ROLE_PERMISSIONS, type Domain, type Grantee } from './permissions';

/** Domaine de chaque alerte (17.6) : il désigne les personnes qui la reçoivent et la traitent. */
const DOMAIN_OF: Record<string, Domain> = {
  payments: 'paiements',
  'payment-change': 'paiements',
  review: 'commandes',
  waiting: 'commandes',
  prepare: 'commandes',
  cancel: 'retours',
  returns: 'retours',
  out: 'stock',
  low: 'stock',
  'anomaly-bestsellers-stock': 'stock',
  'late-support': 'clients',
  claims: 'clients',
  'emails-failed': 'clients',
  'anomaly-cancellations': 'commandes',
  'anomaly-revenue-drop': 'pilotage',
};

export const alertDomain = (key: string): Domain => DOMAIN_OF[key] ?? 'pilotage';

/** L'alerte est destinée à ce membre : administrateur principal, ou droit de consulter son domaine. */
export const isRecipient = (who: Grantee | null | undefined, key: string) =>
  !!who && can(who, `${alertDomain(key)}:consulter`);

/** Rôles destinataires, pour l'affichage (les rôles personnalisés s'ajoutent selon leurs droits). */
export function recipientRoles(key: string): string[] {
  const domain = alertDomain(key);
  const roles = (Object.keys(ROLE_PERMISSIONS) as Array<Exclude<AdminRole, 'super_admin'>>).filter((r) =>
    ROLE_PERMISSIONS[r].includes(`${domain}:consulter`),
  );
  return [adminRoleLabel.super_admin, ...roles.map((r) => adminRoleLabel[r])];
}
