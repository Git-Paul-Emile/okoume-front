import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/utils/text';

/**
 * Fil d'Ariane sur une seule ligne, sur mobile comme sur grand écran : si la place manque,
 * seul le dernier élément est raccourci (« … »). Il ne passe à la ligne que sur un écran très étroit (< 360 px).
 */
export function Breadcrumbs({ items }: { items: Array<{ label: string; to?: string }> }) {
  return (
    <nav aria-label="Fil d’Ariane" className="mb-5 text-[13px] sm:text-sm">
      <ol className="flex flex-nowrap items-center gap-1.5 text-ink-muted max-[359px]:flex-wrap">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className={cn('flex items-center gap-1.5', last ? 'min-w-0' : 'shrink-0')}>
              {i > 0 && <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />}
              {item.to ? (
                <Link to={item.to} className="whitespace-nowrap hover:text-forest">
                  {item.label}
                </Link>
              ) : (
                <span
                  className="truncate font-medium text-ink max-[359px]:whitespace-normal"
                  aria-current="page"
                  title={item.label}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
