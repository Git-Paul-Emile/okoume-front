import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Drawer } from '@/components/ui/Drawer';
import { useCategories } from '@/features/categories/categories.queries';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/utils/text';
import { mainLinks } from './navigation';

export function MobileMenu() {
  const open = useUiStore((s) => s.mobileMenuOpen);
  const setOpen = useUiStore((s) => s.setMobileMenuOpen);
  const { data } = useCategories();
  const [expanded, setExpanded] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname, location.search, setOpen]);

  return (
    <Drawer open={open} onClose={() => setOpen(false)} title="Menu" side="left">
      <nav className="p-3" aria-label="Menu mobile">
        <p className="px-3 pt-2 pb-1 text-xs font-bold tracking-wider text-ink-muted uppercase">Catégories</p>
        <ul>
          {data?.tree.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left font-medium hover:bg-ivory"
                aria-expanded={expanded === c.id}
              >
                <CategoryIcon name={c.icon} />
                <span className="flex-1">{c.name}</span>
                <ChevronDown className={cn('size-4 transition-transform', expanded === c.id && 'rotate-180')} />
              </button>
              {expanded === c.id && (
                <ul className="mb-2 ml-10 border-l border-sage pl-3">
                  {c.children.map((s) => (
                    <li key={s.id}>
                      <Link
                        to={`/catalogue?categorie=${s.id}`}
                        className="block py-2 text-sm text-ink-soft hover:text-forest"
                      >
                        {s.name}
                      </Link>
                      {s.children.length > 0 && (
                        <ul className="ml-3 border-l border-sage pl-3">
                          {s.children.map((g) => (
                            <li key={g.id}>
                              <Link
                                to={`/catalogue?categorie=${g.id}`}
                                className="block py-1.5 text-sm text-ink-soft hover:text-forest"
                              >
                                {g.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                  <li>
                    <Link to={`/catalogue?categorie=${c.id}`} className="block py-2 text-sm font-semibold text-forest">
                      Tout voir
                    </Link>
                  </li>
                </ul>
              )}
            </li>
          ))}
        </ul>
        <p className="px-3 pt-5 pb-1 text-xs font-bold tracking-wider text-ink-muted uppercase">Navigation</p>
        <ul>
          {[
            ...mainLinks,
            { to: '/promotions', label: 'Promotions' },
            { to: '/suivi', label: 'Suivre ma commande' },
          ].map((l) => (
            <li key={l.to}>
              <Link to={l.to} className="block rounded-md px-3 py-3 font-medium hover:bg-ivory">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </Drawer>
  );
}
