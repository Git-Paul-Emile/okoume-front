import { motion } from 'motion/react';
import { Search } from 'lucide-react';
import { useId, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/utils/text';

/** Ligne d'outils au-dessus d'un tableau : filtres à gauche, recherche et actions à droite. */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-3">{children}</div>;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative block w-full sm:ml-auto sm:w-72">
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input h-10 pl-9"
      />
    </label>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; count?: number }>;
  label: string;
}

/** Choix exclusif compact (filtre de statut, période) avec un indicateur qui glisse. */
export function Segmented<T extends string>({ value, onChange, options, label }: SegmentedProps<T>) {
  const id = useId();
  // Clavier d'un groupe de boutons radio : flèches, Début et Fin déplacent la sélection
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = options.findIndex((o) => o.value === value);
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? (i + 1) % options.length
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? (i - 1 + options.length) % options.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? options.length - 1
              : -1;
    if (next < 0) return;
    e.preventDefault();
    onChange(options[next].value);
    (e.currentTarget.children[next] as HTMLElement | undefined)?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="flex max-w-full overflow-x-auto rounded-md border border-sage-dark bg-white p-1 [scrollbar-width:none]"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          tabIndex={value === o.value ? 0 : -1}
          onClick={() => onChange(o.value)}
          className={cn(
            'relative h-8 shrink-0 rounded-sm px-3 text-sm font-semibold whitespace-nowrap transition-colors',
            value === o.value ? 'text-white' : 'text-ink-soft hover:text-ink',
          )}
        >
          {value === o.value && (
            <motion.span layoutId={`segmented-${id}`} className="absolute inset-0 rounded-sm bg-forest" />
          )}
          <span className="relative">
            {o.label}
            {o.count !== undefined && <span className="ml-1.5 opacity-70 tabular-nums">{o.count}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Courte explication de l'écran et actions principales, sous le titre de la barre supérieure. */
export function PageIntro({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <p className="max-w-2xl text-ink-soft">{children}</p>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Rangée de chiffres clés en tête d'écran. */
export function StatRow({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((s) => (
        <div key={s.label} className="card min-w-0 p-4">
          <p className="truncate text-sm text-ink-muted">{s.label}</p>
          <p className="mt-1 text-xl font-extrabold text-ink tabular-nums">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
