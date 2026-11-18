import {
  BadgePercent,
  Bike,
  Boxes,
  ChartColumn,
  ClipboardCheck,
  CreditCard,
  FolderTree,
  History,
  LayoutDashboard,
  LifeBuoy,
  Lightbulb,
  Megaphone,
  Newspaper,
  Package,
  Settings,
  FileLock,
  KeyRound,
  Mail,
  ShieldCheck,
  ShoppingBag,
  Store,
  Siren,
  Star,
  Truck,
  Undo2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { AdminRole } from './admin.types';
import { can, hasCustomPermission, isOwner, rolesOf, screenDomain } from './permissions';

/** Écrans du back-office branchés sur l'API ; les autres restent fermés jusqu'à leur branchement. */
export const SERVER_SCREENS = [
  '/admin/commandes',
  '/admin/livraisons',
  '/admin/livreurs',
  '/admin/paiements',
  '/admin/produits',
  '/admin/categories',
  '/admin/stock',
  '/admin/inventaire',
  '/admin/retours',
  '/admin/promotions',
  '/admin/assistance',
  '/admin/donnees-personnelles',
  '/admin/avis',
  '/admin/contenus',
  '/admin/editorial',
  '/admin/parametres',
  '/admin/clients',
  '/admin/equipe',
  '/admin/statistiques',
  '/admin/journal',
  '/admin/alertes',
  '/admin/emails',
  '/admin/assistant',
  '/admin/securite',
  '/admin/place-de-marche',
] as const;

/** L'écran est-il branché sur l'API ? */
const matches = (pathname: string, screens: readonly string[]) =>
  screens.some((screen) => pathname === screen || pathname.startsWith(`${screen}/`));

/** Le tableau de bord est l'adresse racine : comparé exactement, pas comme préfixe de tous les écrans. */
const isDashboard = (pathname: string) => pathname === '/admin' || pathname === '/admin/';

export const availableWithSource = (pathname: string) => isDashboard(pathname) || matches(pathname, SERVER_SCREENS);

export type BadgeKey = 'orders' | 'payments' | 'returns' | 'stock' | 'support' | 'alerts' | 'privacy';

export interface AdminNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: BadgeKey;
  /** Rôles autorisés (cahier des charges, 2.3 et 2.4). L'administrateur principal a toujours accès. */
  roles: AdminRole[];
  /** Aucun rôle standard, mais ouvert à un rôle personnalisé qui accorde la consultation du domaine */
  customRoles?: boolean;
}

const ALL: AdminRole[] = ['catalog_manager', 'orders_manager', 'stock_manager'];
const ORDERS: AdminRole[] = ['orders_manager'];
const CATALOG: AdminRole[] = ['catalog_manager'];
const STOCK: AdminRole[] = ['stock_manager'];

/** Menu du back-office, regroupé par domaine. Sert aussi de référence aux droits par rôle. */
export const adminNavigation: Array<{ title: string; items: AdminNavItem[] }> = [
  {
    title: 'Pilotage',
    items: [
      { to: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, roles: ALL },
      { to: '/admin/statistiques', label: 'Statistiques et exports', icon: ChartColumn, roles: ALL },
      { to: '/admin/alertes', label: 'Alertes', icon: Siren, badge: 'alerts', roles: ALL },
      { to: '/admin/assistant', label: 'Assistant', icon: Lightbulb, roles: ALL },
    ],
  },
  {
    title: 'Ventes',
    items: [
      { to: '/admin/commandes', label: 'Commandes', icon: ShoppingBag, badge: 'orders', roles: ORDERS },
      { to: '/admin/paiements', label: 'Paiements', icon: CreditCard, badge: 'payments', roles: ORDERS },
      { to: '/admin/retours', label: 'Annulations et retours', icon: Undo2, badge: 'returns', roles: ORDERS },
      { to: '/admin/livraisons', label: 'Livraisons', icon: Truck, roles: ORDERS },
      { to: '/admin/livreurs', label: 'Livreurs', icon: Bike, roles: ORDERS },
    ],
  },
  {
    title: 'Catalogue',
    items: [
      { to: '/admin/produits', label: 'Produits', icon: Package, roles: CATALOG },
      { to: '/admin/categories', label: 'Catégories', icon: FolderTree, roles: CATALOG },
      { to: '/admin/stock', label: 'Stock', icon: Boxes, badge: 'stock', roles: [...STOCK, ...CATALOG] },
      { to: '/admin/inventaire', label: 'Inventaire', icon: ClipboardCheck, roles: STOCK },
      { to: '/admin/promotions', label: 'Promotions', icon: BadgePercent, roles: CATALOG },
    ],
  },
  {
    title: 'Clients',
    items: [
      { to: '/admin/clients', label: 'Clients', icon: Users, roles: ORDERS },
      { to: '/admin/emails', label: 'Suivi des e-mails', icon: Mail, roles: ORDERS },
      {
        to: '/admin/donnees-personnelles',
        label: 'Données personnelles',
        icon: FileLock,
        badge: 'privacy',
        roles: ORDERS,
      },
      { to: '/admin/avis', label: 'Avis', icon: Star, roles: [...ORDERS, ...CATALOG] },
      { to: '/admin/assistance', label: 'Assistance', icon: LifeBuoy, badge: 'support', roles: ORDERS },
    ],
  },
  {
    title: 'Place de marché',
    items: [{ to: '/admin/place-de-marche', label: 'Vendeurs et annonces', icon: Store, roles: [], customRoles: true }],
  },
  {
    title: 'Configuration',
    items: [
      { to: '/admin/contenus', label: 'Bannières et publicités', icon: Megaphone, roles: CATALOG },
      { to: '/admin/editorial', label: 'Articles et pages légales', icon: Newspaper, roles: CATALOG },
      { to: '/admin/equipe', label: 'Équipe et rôles', icon: ShieldCheck, roles: [] },
      { to: '/admin/securite', label: 'Ma sécurité', icon: KeyRound, roles: ALL },
      { to: '/admin/journal', label: 'Journal d’activité', icon: History, roles: [] },
      { to: '/admin/parametres', label: 'Paramètres', icon: Settings, roles: [] },
    ],
  },
];

export const adminRoleLabel: Record<AdminRole, string> = {
  super_admin: 'Administrateur principal',
  catalog_manager: 'Gestionnaire catalogue',
  orders_manager: 'Gestionnaire commandes',
  stock_manager: 'Gestionnaire stock',
};

const allItems = adminNavigation.flatMap((g) => g.items);

const itemFor = (pathname: string) =>
  pathname === '/admin' || pathname === '/admin/'
    ? allItems[0]
    : allItems.find((i) => i.to !== '/admin' && pathname.startsWith(i.to));

type Who = Parameters<typeof can>[0];

/**
 * Écran visible si l'un des rôles du membre y donne accès, ou si un rôle personnalisé
 * accorde la consultation de son domaine (2.4).
 */
export const hasRole = (who: Who, item: AdminNavItem) => {
  if (isOwner(who)) return true;
  if (rolesOf(who).some((r) => item.roles.includes(r))) return true;
  const domain = screenDomain(item.to);
  return !!domain && (item.roles.length > 0 || !!item.customRoles) && hasCustomPermission(who, `${domain}:consulter`);
};

/** Accès à un écran. Contrôle d'interface : l'API doit refaire ce contrôle. */
export const canAccess = (who: Who, pathname: string) => {
  const item = itemFor(pathname);
  return !item || hasRole(who, item);
};

/** Exports réservés à l'administrateur principal et aux membres explicitement autorisés (18.3). */
export const canExport = (who: Who) => can(who, 'exports:exporter');

export const adminPageTitle = (pathname: string) => itemFor(pathname)?.label ?? 'Back-office';
