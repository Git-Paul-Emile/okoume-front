import {
  BadgePercent,
  Bike,
  Boxes,
  CreditCard,
  FolderTree,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  Package,
  Settings,
  ShoppingBag,
  Star,
  Store,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import type { AdminRole } from './admin.types';
import { isOwner } from './permissions';

export const SERVER_SCREENS = [
  '/admin/commandes',
  '/admin/livraisons',
  '/admin/livreurs',
  '/admin/paiements',
  '/admin/reversements',
  '/admin/produits',
  '/admin/categories',
  '/admin/stock',
  '/admin/promotions',
  '/admin/avis',
  '/admin/contenus',
  '/admin/parametres',
  '/admin/securite',
  '/admin/place-de-marche',
] as const;

const matches = (pathname: string, screens: readonly string[]) =>
  screens.some((screen) => pathname === screen || pathname.startsWith(`${screen}/`));

const isDashboard = (pathname: string) => pathname === '/admin' || pathname === '/admin/';

export const availableWithSource = (pathname: string) => isDashboard(pathname) || matches(pathname, SERVER_SCREENS);

export type BadgeKey = 'orders' | 'payments' | 'stock';

export interface AdminNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: BadgeKey;
  roles: AdminRole[];
}

const OWNER: AdminRole[] = ['super_admin'];

export const adminNavigation: Array<{ title: string; items: AdminNavItem[] }> = [
  {
    title: 'Ventes',
    items: [
      { to: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, roles: OWNER },
      { to: '/admin/commandes', label: 'Commandes', icon: ShoppingBag, badge: 'orders', roles: OWNER },
      { to: '/admin/paiements', label: 'Paiements', icon: CreditCard, badge: 'payments', roles: OWNER },
      { to: '/admin/reversements', label: 'Reversements vendeurs', icon: CreditCard, roles: OWNER },
      { to: '/admin/livraisons', label: 'Livraisons', icon: Truck, roles: OWNER },
      { to: '/admin/livreurs', label: 'Livreurs', icon: Bike, roles: OWNER },
    ],
  },
  {
    title: 'Catalogue',
    items: [
      { to: '/admin/produits', label: 'Produits', icon: Package, roles: OWNER },
      { to: '/admin/categories', label: 'Catégories', icon: FolderTree, roles: OWNER },
      { to: '/admin/stock', label: 'Stock', icon: Boxes, badge: 'stock', roles: OWNER },
      { to: '/admin/promotions', label: 'Promotions', icon: BadgePercent, roles: OWNER },
      { to: '/admin/avis', label: 'Avis et notes', icon: Star, roles: OWNER },
    ],
  },
  {
    title: 'Boutiques',
    items: [{ to: '/admin/place-de-marche', label: 'Vendeurs', icon: Store, roles: OWNER }],
  },
  {
    title: 'Configuration',
    items: [
      { to: '/admin/contenus', label: 'Bannières et publicités', icon: Megaphone, roles: OWNER },
      { to: '/admin/parametres', label: 'Paramètres', icon: Settings, roles: OWNER },
      { to: '/admin/securite', label: 'Sessions', icon: KeyRound, roles: OWNER },
    ],
  },
];

export const adminRoleLabel: Record<AdminRole, string> = { super_admin: 'Administrateur' };

const allItems = adminNavigation.flatMap((group) => group.items);

const itemFor = (pathname: string) =>
  isDashboard(pathname) ? allItems[0] : allItems.find((item) => item.to !== '/admin' && pathname.startsWith(item.to));

type Who = Parameters<typeof isOwner>[0];

export const hasRole = (who: Who, _item: AdminNavItem) => isOwner(who);

export const canAccess = (who: Who, pathname: string) => {
  const item = itemFor(pathname);
  return !item || hasRole(who, item);
};

export const adminPageTitle = (pathname: string) => itemFor(pathname)?.label ?? 'Back-office';
