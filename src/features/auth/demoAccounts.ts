export type DemoLoginRole =
  | { label: string; email: string; password: string; destination: string }
  | { label: string; href: string };

const demoPassword = import.meta.env.DEV ? __OKOZA_DEMO_PASSWORD__ : undefined;

/** Profils de démonstration de la base E2E ; ils ne sont proposés qu'en développement. */
export const demoLoginRoles: DemoLoginRole[] = demoPassword
  ? [
      { label: 'Client', email: 'demo@boutique.ga', password: demoPassword, destination: '/compte' },
      {
        label: 'Vendeur',
        email: 'ornella.bibang@exemple.ga',
        password: demoPassword,
        destination: '/vendeur',
      },
      { label: 'Administrateur', href: '/admin/connexion?demo=admin' },
    ]
  : [];

export const demoAdminCredentials = demoPassword
  ? { email: 'admin@boutique.ga', password: demoPassword }
  : null;
