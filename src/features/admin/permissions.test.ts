import { can, customPermissions, isOwner, permissionsOf, rolesOf, screenDomain } from './permissions';

describe('permissions', () => {
  it('l’administrateur principal a tous les droits', () => {
    expect(can('super_admin', 'exports:exporter')).toBe(true);
    expect(isOwner({ role: 'stock_manager', extraRoles: ['super_admin'] })).toBe(true);
  });

  it('cumule les rôles standards', () => {
    const member = { role: 'stock_manager' as const, extraRoles: ['catalog_manager' as const] };
    expect(rolesOf(member)).toEqual(['stock_manager', 'catalog_manager']);
    expect(can(member, 'catalogue:publier')).toBe(true);
    expect(can(member, 'stock:valider')).toBe(true);
    expect(can(member, 'paiements:valider')).toBe(false);
  });

  it('ajoute les droits des rôles personnalisés', () => {
    const roles = [
      { id: 'r1', name: 'Comptable', permissions: ['paiements:consulter' as const, 'exports:exporter' as const] },
    ];
    const member = { role: 'stock_manager' as const, customPermissions: customPermissions(['r1'], roles) };
    expect(can(member, 'exports:exporter')).toBe(true);
    expect(permissionsOf(member).has('paiements:valider')).toBe(false);
  });

  it('relie chaque écran à son domaine', () => {
    expect(screenDomain('/admin')).toBe('pilotage');
    expect(screenDomain('/admin/paiements')).toBe('paiements');
    expect(screenDomain('/admin/donnees-personnelles')).toBe('donnees_sensibles');
    expect(screenDomain('/admin/equipe')).toBeNull();
  });

  it('un rôle standard ne voit que les écrans de son menu', async () => {
    const { hasRole, adminNavigation } = await import('./admin.navigation');
    const item = (to: string) => adminNavigation.flatMap((g) => g.items).find((i) => i.to === to)!;
    expect(hasRole('catalog_manager', item('/admin/avis'))).toBe(true);
    expect(hasRole('catalog_manager', item('/admin/clients'))).toBe(false);
    const accountant = { role: 'stock_manager' as const, customPermissions: ['paiements:consulter'] };
    expect(hasRole(accountant, item('/admin/paiements'))).toBe(true);
    expect(hasRole(accountant, item('/admin/commandes'))).toBe(false);
  });
});
