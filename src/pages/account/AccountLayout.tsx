import { motion } from 'motion/react';
import { Heart, LayoutDashboard, LogOut, MapPin, Package, Store, User } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { PageLoader } from '@/components/feedback/PageLoader';
import { useCurrentUser, useLogout } from '@/features/auth/auth.queries';
import { toast } from '@/stores/toastStore';
import { cn } from '@/utils/text';

const links = [
  { to: '/compte', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/compte/commandes', label: 'Mes commandes', icon: Package },
  { to: '/vendeur', label: 'Espace vendeur', icon: Store },
  { to: '/compte/favoris', label: 'Mes favoris', icon: Heart },
  { to: '/compte/adresses', label: 'Mes adresses', icon: MapPin },
  { to: '/compte/profil', label: 'Profil et préférences', icon: User },
];

export default function AccountLayout() {
  const { user, isLoading } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();

  if (isLoading || !user) return <PageLoader />;

  return (
    <div className="container-page py-6 lg:py-8">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside>
          <div className="card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-sage bg-forest-50 p-5">
              <span className="grid size-12 place-items-center rounded-full bg-forest text-lg font-bold text-white">
                {user.firstName[0]}
                {user.lastName[0]}
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold">
                  {user.firstName} {user.lastName}
                </p>
                <p className="truncate text-xs text-ink-muted">{user.email}</p>
              </div>
            </div>
            <nav aria-label="Mon compte" className="flex gap-1 overflow-x-auto p-2 lg:flex-col">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    cn(
                      'relative flex shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                      isActive ? 'text-forest' : 'text-ink hover:bg-ivory',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="account-nav"
                          className="absolute inset-0 rounded-md bg-forest-50"
                          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                        />
                      )}
                      <l.icon className="relative size-[18px]" />
                      <span className="relative">{l.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
              <button
                type="button"
                onClick={() => {
                  logout();
                  toast.info('Vous êtes déconnecté');
                  navigate('/');
                }}
                className="flex shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-mure-50 hover:text-mure"
              >
                <LogOut className="size-[18px]" /> Se déconnecter
              </button>
            </nav>
          </div>
        </aside>
        <section>
          <Outlet />
        </section>
      </div>
    </div>
  );
}
