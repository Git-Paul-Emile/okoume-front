import type { AdminRole } from './admin.types';

/**
 * Permissions granulaires (2.4) : un domaine et une action. Un membre peut cumuler plusieurs rôles
 * standards et des rôles personnalisés ; ses droits sont l'union de tous. Contrôle d'interface :
 * en production, l'API applique les mêmes règles.
 */
export const DOMAINS = {
  pilotage: 'Pilotage et statistiques',
  commandes: 'Commandes et livraisons',
  paiements: 'Paiements',
  retours: 'Annulations et retours',
  catalogue: 'Catalogue, promotions et contenus',
  stock: 'Stock et inventaire',
  clients: 'Clients, avis et assistance',
  donnees_sensibles: 'Données personnelles sensibles',
  exports: 'Exports de données',
  vendeurs: 'Place de marché : boutiques et annonces des vendeurs',
} as const;
export type Domain = keyof typeof DOMAINS;

export const ACTIONS = {
  consulter: 'Consulter',
  creer: 'Créer',
  modifier: 'Modifier',
  publier: 'Publier',
  annuler: 'Annuler',
  exporter: 'Exporter',
  valider: 'Valider',
  executer: 'Exécuter',
} as const;
export type Action = keyof typeof ACTIONS;
export type Permission = `${Domain}:${Action}`;

/** Droit reçu de l'API : retenu seulement s'il est connu de l'interface. */
export const isPermission = (value: string): value is Permission => {
  const [domain, action] = value.split(':');
  return !!domain && !!action && domain in DOMAINS && action in ACTIONS && value.split(':').length === 2;
};

/** Écrans du back-office et domaine dont la consultation y donne accès. */
const SCREEN_DOMAIN: Array<[string, Domain]> = [
  ['/admin/commandes', 'commandes'],
  ['/admin/livraisons', 'commandes'],
  ['/admin/livreurs', 'commandes'],
  ['/admin/paiements', 'paiements'],
  ['/admin/retours', 'retours'],
  ['/admin/produits', 'catalogue'],
  ['/admin/categories', 'catalogue'],
  ['/admin/promotions', 'catalogue'],
  ['/admin/contenus', 'catalogue'],
  ['/admin/editorial', 'catalogue'],
  ['/admin/stock', 'stock'],
  ['/admin/inventaire', 'stock'],
  ['/admin/clients', 'clients'],
  ['/admin/emails', 'clients'],
  ['/admin/donnees-personnelles', 'donnees_sensibles'],
  ['/admin/avis', 'clients'],
  ['/admin/assistance', 'clients'],
  ['/admin/statistiques', 'pilotage'],
  ['/admin/alertes', 'pilotage'],
  ['/admin/assistant', 'pilotage'],
  ['/admin/securite', 'pilotage'],
  ['/admin/place-de-marche', 'vendeurs'],
];

export const screenDomain = (pathname: string): Domain | null => {
  if (pathname === '/admin' || pathname === '/admin/') return 'pilotage';
  return SCREEN_DOMAIN.find(([p]) => pathname.startsWith(p))?.[1] ?? null;
};

const all = (domain: Domain, actions: Action[]) => actions.map((a) => `${domain}:${a}` as Permission);

/** Droits des rôles standards. L'administrateur principal a tous les droits. */
export const ROLE_PERMISSIONS: Record<Exclude<AdminRole, 'super_admin'>, Permission[]> = {
  catalog_manager: [
    ...all('pilotage', ['consulter']),
    ...all('catalogue', ['consulter', 'creer', 'modifier', 'publier']),
    ...all('stock', ['consulter', 'modifier']),
    ...all('clients', ['consulter', 'valider']),
  ],
  orders_manager: [
    ...all('pilotage', ['consulter']),
    ...all('commandes', ['consulter', 'creer', 'modifier', 'annuler', 'valider', 'executer']),
    ...all('paiements', ['consulter', 'valider', 'annuler']),
    ...all('retours', ['consulter', 'modifier', 'executer']),
    ...all('clients', ['consulter', 'modifier', 'valider']),
    ...all('donnees_sensibles', ['consulter']),
  ],
  stock_manager: [...all('pilotage', ['consulter']), ...all('stock', ['consulter', 'creer', 'modifier', 'valider'])],
};

/** Rôle personnalisé défini par l'administrateur principal. */
export interface CustomRole {
  id: string;
  name: string;
  permissions: Permission[];
}

/** Ce qu'il faut savoir d'un membre pour calculer ses droits (session ou fiche d'équipe). */
export interface Grantee {
  role: AdminRole;
  /** Rôles standards cumulés en plus du rôle principal. */
  extraRoles?: AdminRole[];
  /** Droits issus des rôles personnalisés, calculés à la connexion. */
  customPermissions?: string[];
}

type Who = Grantee | AdminRole | string | null | undefined;
const asGrantee = (who: Who): Grantee | null =>
  !who ? null : typeof who === 'string' ? { role: who as AdminRole } : who;

export const rolesOf = (who: Who): AdminRole[] => {
  const g = asGrantee(who);
  return g ? [...new Set([g.role, ...(g.extraRoles ?? [])])] : [];
};

export const isOwner = (who: Who) => rolesOf(who).includes('super_admin');

export function permissionsOf(who: Who): Set<string> {
  const g = asGrantee(who);
  const set = new Set<string>(g?.customPermissions ?? []);
  rolesOf(who).forEach((r) => r !== 'super_admin' && ROLE_PERMISSIONS[r].forEach((p) => set.add(p)));
  return set;
}

export const can = (who: Who, permission: Permission) => isOwner(who) || permissionsOf(who).has(permission);

/** Droits issus des rôles personnalisés attribués à un membre. */
export const customPermissions = (customRoleIds: string[] = [], roles: CustomRole[]) => [
  ...new Set(roles.filter((r) => customRoleIds.includes(r.id)).flatMap((r) => r.permissions)),
];

/** Droit accordé par un rôle personnalisé (l'accès aux écrans des rôles standards suit le menu). */
export const hasCustomPermission = (who: Who, permission: Permission) =>
  !!asGrantee(who)?.customPermissions?.includes(permission);
