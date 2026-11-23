import { can, isOwner, permissionsOf, rolesOf, screenDomain } from './permissions';

describe('permissions', () => {
  it('donne les mêmes droits d’administration à tous les membres de l’équipe', async () => {
    expect(can('super_admin', 'exports:exporter')).toBe(true);
    expect(can('orders_manager', 'stock:valider')).toBe(true);
    expect(isOwner({ role: 'super_admin' })).toBe(true);
    expect(rolesOf('stock_manager')).toEqual(['super_admin']);
    expect(permissionsOf('orders_manager')).toEqual(new Set());
  });

  it('conserve le repérage des domaines pour les pages restantes', () => {
    expect(screenDomain('/admin')).toBe('pilotage');
    expect(screenDomain('/admin/paiements')).toBe('paiements');
    expect(screenDomain('/admin/donnees-personnelles')).toBeNull();
    expect(screenDomain('/admin/equipe')).toBeNull();
  });

  it('ouvre chaque écran à tout administrateur', async () => {
    const { hasRole, adminNavigation } = await import('./admin.navigation');
    const item = (to: string) => adminNavigation.flatMap((group) => group.items).find((entry) => entry.to === to)!;
    expect(hasRole('catalog_manager', item('/admin/avis'))).toBe(true);
    expect(hasRole('catalog_manager', item('/admin/clients'))).toBe(true);
    expect(hasRole('orders_manager', item('/admin/paiements'))).toBe(true);
    expect(hasRole('stock_manager', item('/admin/commandes'))).toBe(true);
  });
});
