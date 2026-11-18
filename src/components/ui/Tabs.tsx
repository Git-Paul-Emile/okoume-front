import { motion } from 'motion/react';
import { useId } from 'react';
import { cn } from '@/utils/text';

interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  label: string;
}

/** Onglets avec un indicateur qui glisse d'un onglet à l'autre. */
export function Tabs<T extends string>({ value, onChange, options, label }: TabsProps<T>) {
  const id = useId();
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none]"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors',
              active ? 'text-forest' : 'text-ink-muted hover:text-ink',
            )}
          >
            {o.label}
            {active && (
              <motion.span
                layoutId={`tab-${id}`}
                className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-forest"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
