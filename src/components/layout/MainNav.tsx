import { Percent } from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useLocation } from 'react-router';
import { CategoryMenu } from '@/features/categories/components/CategoryMenu';
import { cn } from '@/utils/text';
import { mainLinks } from './navigation';

export function MainNav() {
  const location = useLocation();
  const current = location.pathname + location.search;
  const isActive = (to: string) =>
    to === '/'
      ? location.pathname === '/'
      : to.includes('?')
        ? current === to
        : location.pathname.startsWith(to) && !location.search.includes('tri=newest');

  return (
    <nav className="hidden border-t border-sage bg-white lg:block" aria-label="Navigation principale">
      <div className="container-page flex h-14 items-center gap-6">
        <CategoryMenu />
        <ul className="flex items-center gap-1">
          {mainLinks.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className={cn(
                  'relative block px-3 py-2 text-sm font-semibold transition-colors',
                  isActive(l.to) ? 'text-forest' : 'text-ink hover:text-forest',
                )}
              >
                {l.label}
                {isActive(l.to) && (
                  <motion.span layoutId="nav-underline" className="absolute inset-x-3 -bottom-[9px] h-0.5 bg-forest" />
                )}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          to="/promotions"
          className="ml-auto inline-flex h-10 items-center gap-2 rounded-md bg-mure px-4 text-sm font-bold text-white transition hover:bg-mure-dark"
        >
          <Percent className="size-4" /> Promotions en cours
        </Link>
      </div>
    </nav>
  );
}
