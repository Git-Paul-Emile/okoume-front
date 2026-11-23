import { AnimatePresence, motion } from 'motion/react';
import { endAdminSession } from '../admin.queries';
import { ChevronsUpDown, LogOut, Store } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { LogoMark } from '@/components/ui/Logo';
import { brand } from '@/config/brand';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { cn } from '@/utils/text';
import { adminNavigation, adminRoleLabel, availableWithSource, hasRole } from '../admin.navigation';
import { useAdminBadges } from '../useAdminBadges';

/**
 * Menu latéral du back-office, groupé par domaine comme sur la maquette.
 * Replié, il ne garde que les icônes (l'intitulé reste disponible en infobulle et pour les lecteurs d'écran).
 */
export function AdminSidebar({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const badges = useAdminBadges();
  const admin = useAdminAuthStore((s) => s.admin);
  const groups = adminNavigation
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => hasRole(admin ?? 'super_admin', i) && availableWithSource(i.to)),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="flex h-full flex-col bg-ink text-white/75">
      <Link
        to="/admin"
        onClick={onNavigate}
        className={cn('flex h-16 shrink-0 items-center gap-2.5 px-5', collapsed && 'justify-center px-0')}
      >
        <LogoMark tone="light" className="size-9 shrink-0" />
        {!collapsed && (
          <span className="leading-tight">
            <span className="block text-lg font-extrabold tracking-tight text-white">{brand.name}</span>
            <span className="block text-[11px] font-medium text-white/55">Back-office</span>
          </span>
        )}
      </Link>

      <nav
        aria-label="Back-office"
        className="flex-1 space-y-5 overflow-y-auto px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {groups.map((group) => (
          <div key={group.title}>
            {collapsed ? (
              <div className="mx-auto mb-2 h-px w-8 bg-white/10" aria-hidden="true" />
            ) : (
              <p className="mb-1.5 px-3 text-xs font-semibold text-white/45">{group.title}</p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const count = item.badge ? (badges[item.badge] ?? 0) : 0;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/admin'}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          'relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors hover:text-white',
                          collapsed && 'justify-center px-0',
                          isActive && 'font-semibold text-white',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <motion.span
                              layoutId="admin-nav-active"
                              className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-mure"
                              aria-hidden="true"
                            />
                          )}
                          <item.icon className="size-[18px] shrink-0" aria-hidden="true" />
                          {collapsed ? (
                            <span className="sr-only">{item.label}</span>
                          ) : (
                            <span className="truncate">{item.label}</span>
                          )}
                          {count > 0 &&
                            (collapsed ? (
                              <span
                                className="absolute top-1.5 right-2 size-2 rounded-full bg-mure"
                                aria-hidden="true"
                              />
                            ) : (
                              <span className="ml-auto rounded-sm bg-mure px-1.5 py-px text-[11px] font-bold text-white">
                                {count}
                              </span>
                            ))}
                          {count > 0 && <span className="sr-only">, {count} en attente</span>}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <AdminUserMenu collapsed={collapsed} />
    </div>
  );
}

function AdminUserMenu({ collapsed }: { collapsed: boolean }) {
  const admin = useAdminAuthStore((s) => s.admin);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!admin) return null;
  const initials = `${admin.firstName[0]}${admin.lastName[0]}`;

  return (
    <div ref={ref} className="relative shrink-0 border-t border-white/10 p-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute bottom-full z-10 mb-2 w-56 rounded-lg bg-white p-1.5 text-sm text-ink shadow-lift',
              collapsed ? 'left-3' : 'inset-x-3 w-auto',
            )}
          >
            <Link to="/" className="flex items-center gap-2.5 rounded-md px-3 py-2 hover:text-forest">
              <Store className="size-4 text-ink-muted" aria-hidden="true" />
              Voir la boutique
            </Link>
            <button
              type="button"
              onClick={endAdminSession}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-danger hover:underline"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Se déconnecter
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-3 rounded-md p-1.5 text-left transition-colors hover:text-white',
          collapsed && 'justify-center',
        )}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-forest text-sm font-bold text-white">
          {initials}
        </span>
        {collapsed ? (
          <span className="sr-only">Menu du compte</span>
        ) : (
          <>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-semibold text-white">
                {admin.firstName} {admin.lastName}
              </span>
              <span className="block truncate text-xs text-white/55">{adminRoleLabel[admin.role]}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-white/45" aria-hidden="true" />
          </>
        )}
      </button>
    </div>
  );
}
