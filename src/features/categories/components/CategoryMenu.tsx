import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Menu } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { cn } from '@/utils/text';
import { useCategories } from '../categories.queries';
import { CategoryIcon } from './CategoryIcon';

/** Bouton « Toutes les catégories » avec méga-menu sur deux niveaux. */
export function CategoryMenu() {
  const location = useLocation();
  const here = location.pathname + location.search;
  // Le menu se referme de lui-même quand la page change
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === here;
  const setOpen = (value: boolean | ((o: boolean) => boolean)) =>
    setOpenAt((typeof value === 'function' ? value(open) : value) ? here : null);
  const { data } = useCategories();
  const [hovered, setHovered] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpenAt(null);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpenAt(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, []);

  const tree = data?.tree ?? [];
  const current = tree.find((c) => c.id === (hovered ?? tree[0]?.id));

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex h-11 items-center gap-2.5 rounded-md bg-forest px-4 text-sm font-semibold text-white transition hover:bg-forest-dark"
      >
        <Menu className="size-[18px]" />
        Toutes les catégories
        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            style={{ transformOrigin: 'top left' }}
            className="absolute top-full left-0 z-40 pt-2"
          >
            <div className="flex w-[620px] overflow-hidden rounded-lg border border-sage bg-white shadow-[var(--shadow-lift)]">
              <ul className="w-64 border-r border-sage py-2">
                {tree.map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/catalogue?categorie=${c.id}`}
                      onMouseEnter={() => setHovered(c.id)}
                      onFocus={() => setHovered(c.id)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors',
                        current?.id === c.id ? 'bg-forest-50 text-forest' : 'text-ink hover:bg-ivory',
                      )}
                    >
                      <CategoryIcon name={c.icon} />
                      <span className="flex-1">{c.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="flex-1 p-5">
                {current && (
                  <motion.div
                    key={current.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="mb-3 text-xs font-bold tracking-wider text-ink-muted uppercase">{current.name}</p>
                    <ul className="grid grid-cols-1 gap-1">
                      {current.children.map((s) => (
                        <li key={s.id}>
                          <Link
                            to={`/catalogue?categorie=${s.id}`}
                            className="block rounded-md px-2 py-1.5 text-sm text-ink hover:bg-ivory hover:text-forest"
                          >
                            {s.name}
                          </Link>
                          {s.children.length > 0 && (
                            <ul className="ml-3 border-l border-sage pl-2">
                              {s.children.map((g) => (
                                <li key={g.id}>
                                  <Link
                                    to={`/catalogue?categorie=${g.id}`}
                                    className="block rounded-md px-2 py-1 text-sm text-ink-soft hover:bg-ivory hover:text-forest"
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
                        <Link
                          to={`/catalogue?categorie=${current.id}`}
                          className="mt-2 block px-2 text-sm font-semibold text-forest hover:underline"
                        >
                          Tout voir
                        </Link>
                      </li>
                    </ul>
                    {current.image && (
                      <img
                        src={current.image}
                        alt=""
                        className="mt-3 ml-auto h-24 w-24 object-contain"
                        loading="lazy"
                      />
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
