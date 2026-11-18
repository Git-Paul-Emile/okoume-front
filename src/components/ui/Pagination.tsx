import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/text';

interface PaginationProps {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pageCount, onChange }: PaginationProps) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1,
  );
  const btn = 'grid size-10 place-items-center rounded-md border text-sm font-semibold transition';
  return (
    <nav className="flex items-center justify-center gap-1.5" aria-label="Pagination">
      <button
        type="button"
        className={cn(btn, 'border-sage-dark bg-white hover:border-forest disabled:opacity-40')}
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="Page précédente"
      >
        <ChevronLeft className="size-4" />
      </button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-ink-muted">…</span>}
          <button
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              btn,
              p === page ? 'border-forest bg-forest text-white' : 'border-sage-dark bg-white hover:border-forest',
            )}
          >
            {p}
          </button>
        </span>
      ))}
      <button
        type="button"
        className={cn(btn, 'border-sage-dark bg-white hover:border-forest disabled:opacity-40')}
        onClick={() => onChange(page + 1)}
        disabled={page === pageCount}
        aria-label="Page suivante"
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}
