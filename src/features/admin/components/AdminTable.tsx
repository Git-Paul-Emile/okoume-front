import { useState, type ReactNode } from 'react';
import { Pagination } from '@/components/ui/Pagination';
import { cn } from '@/utils/text';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  pageSize?: number;
  /** Intitulé lu par les lecteurs d'écran. */
  caption: string;
}

/** Tableau du back-office : en-têtes fixes, lignes cliquables, pagination ; défile horizontalement sur mobile. */
export function AdminTable<T>({ columns, rows, rowKey, onRowClick, empty, pageSize = 15, caption }: Props<T>) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * pageSize, current * pageSize);
  const align = (a?: Column<T>['align']) =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-sage bg-ivory/60">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    'px-4 py-3 text-xs font-semibold whitespace-nowrap text-ink-muted',
                    align(c.align),
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(
                  'border-b border-sage/70 last:border-0',
                  onRowClick && 'cursor-pointer transition-colors hover:bg-ivory/70 focus-visible:bg-ivory',
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3 align-middle', align(c.align), c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="px-6 py-12 text-center text-ink-muted">{empty ?? 'Aucun résultat.'}</div>}
      </div>
      {pageCount > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sage px-4 py-3">
          <p className="text-sm text-ink-muted">
            {(current - 1) * pageSize + 1} à {Math.min(current * pageSize, rows.length)} sur {rows.length}
          </p>
          <Pagination page={current} pageCount={pageCount} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
