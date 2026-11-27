import type { AdminRole } from './admin.types';

/** Domaines fonctionnels conservés pour les journaux et le ciblage des alertes. */
export const DOMAINS = {
  pilotage: 'Pilotage et statistiques',
  commandes: 'Commandes et livraisons',
  paiements: 'Paiements',
  catalogue: 'Catalogue, promotions et contenus',
  stock: 'Gestion du stock',
  clients: 'Clients et avis',
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
  ['/admin/reversements', 'paiements'],
  ['/admin/produits', 'catalogue'],
  ['/admin/categories', 'catalogue'],
  ['/admin/promotions', 'catalogue'],
  ['/admin/contenus', 'catalogue'],
  ['/admin/stock', 'stock'],
  ['/admin/avis', 'clients'],
  ['/admin/securite', 'pilotage'],
  ['/admin/place-de-marche', 'vendeurs'],
];

export const screenDomain = (pathname: string): Domain | null => {
  if (pathname === '/admin' || pathname === '/admin/') return 'pilotage';
  return SCREEN_DOMAIN.find(([p]) => pathname.startsWith(p))?.[1] ?? null;
};

export interface Grantee { role: AdminRole }

type Who = Grantee | AdminRole | string | null | undefined;
const asGrantee = (who: Who): Grantee | null =>
  !who ? null : typeof who === 'string' ? { role: who as AdminRole } : who;

export const rolesOf = (who: Who): AdminRole[] => {
  return asGrantee(who) ? ['super_admin'] : [];
};

/** Tous les comptes du back-office ont les mêmes droits d'administration dans le MVP. */
export const isOwner = (who: Who) => !!asGrantee(who);

export const permissionsOf = (_who: Who): Set<string> => new Set();

export const can = (who: Who, _permission: Permission) => isOwner(who);
