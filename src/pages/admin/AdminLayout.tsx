import { AnimatePresence, motion } from 'motion/react';
import { Lock, Menu, PanelLeftClose, PanelLeftOpen, Store, X } from 'lucide-react';
import { Suspense, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Toaster } from '@/components/feedback/Toaster';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ButtonLink } from '@/components/ui/Button';
import { adminPageTitle, availableWithSource, canAccess } from '@/features/admin/admin.navigation';
import { AdminSidebar } from '@/features/admin/components/AdminSidebar';
import { useSessionGuard } from '@/features/admin/useSessionGuard';
import { useSessionTimeout } from '@/features/admin/useSessionTimeout';
import { ChartsTheme } from '@/features/admin/components/ChartsTheme';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { cn } from '@/utils/text';

const COLLAPSE_KEY = 'shop-admin-sidebar';

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Mise en page du back-office : menu latéral repliable, barre supérieure et contenu. */
export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const admin = useAdminAuthStore((s) => s.admin);
  useSessionTimeout();
  useSessionGuard();
  useLockBodyScroll(mobileOpen);

  const toggle = () => {
    setCollapsed((v) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, v ? '0' : '1');
      } catch {
        // Stockage indisponible : la préférence n'est simplement pas mémorisée
      }
      return !v;
    });
  };

  return (
    <div className="min-h-dvh bg-ivory">
      <a
        href="#contenu"
        className="sr-only z-[80] rounded-md bg-forest px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Aller au contenu
      </a>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-300 lg:block',
          collapsed ? 'w-[76px]' : 'w-[264px]',
        )}
      >
        <AdminSidebar collapsed={collapsed} />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-ink/45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw]"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <AdminSidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-3 grid size-9 place-items-center text-white/70 hover:text-white"
                aria-label="Fermer le menu"
              >
                <X className="size-5" />
              </button>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className={cn('transition-[padding] duration-300', collapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]')}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-sage bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid size-10 place-items-center rounded-md text-ink hover:text-forest lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu className="size-5" />
          </button>
          <button
            type="button"
            onClick={toggle}
            className="hidden size-10 place-items-center rounded-md text-ink hover:text-forest lg:grid"
            aria-label={collapsed ? 'Déplier le menu' : 'Replier le menu'}
            aria-pressed={collapsed}
          >
            {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </button>
          <span className="hidden h-6 w-px bg-sage lg:block" aria-hidden="true" />
          <h1 className="truncate text-lg">{adminPageTitle(pathname)}</h1>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link
              to="/"
              className="hidden h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-ink hover:text-forest sm:inline-flex"
            >
              <Store className="size-4" aria-hidden="true" />
              Voir la boutique
            </Link>
            {admin && (
              <span
                className="grid size-9 place-items-center rounded-full bg-forest text-sm font-bold text-white"
                title={`${admin.firstName} ${admin.lastName}`}
                role="img"
                aria-label={`Connecté : ${admin.firstName} ${admin.lastName}`}
              >
                {admin.firstName[0]}
                {admin.lastName[0]}
              </span>
            )}
          </div>
        </header>

        <main id="contenu" tabIndex={-1} className="px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
          <ChartsTheme>
            <Suspense fallback={<PageLoader />}>
              {!availableWithSource(pathname) ? (
                <div className="card">
                  <EmptyState
                    icon={<Lock />}
                    title="Écran pas encore branché sur l’API"
                    description="Cet écran sera disponible quand son module sera relié au serveur. En attendant, ventes, catalogue, stock, retours et codes promo sont gérés depuis le menu."
                    action={
                      <ButtonLink to="/admin/commandes" variant="outline">
                        Aller aux commandes
                      </ButtonLink>
                    }
                  />
                </div>
              ) : admin && !canAccess(admin, pathname) ? (
                <div className="card">
                  <EmptyState
                    icon={<Lock />}
                    title="Accès réservé"
                    description="Cet écran n’est pas disponible dans la version actuelle de la plateforme."
                    action={
                      <ButtonLink to="/admin" variant="outline">
                        Revenir au tableau de bord
                      </ButtonLink>
                    }
                  />
                </div>
              ) : (
                <Outlet />
              )}
            </Suspense>
          </ChartsTheme>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
