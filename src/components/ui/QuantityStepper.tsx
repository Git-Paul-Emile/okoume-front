import { Minus, Plus } from 'lucide-react';
import { cn } from '@/utils/text';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
  label?: string;
}

export function QuantityStepper({ value, onChange, min = 1, max = 99, size = 'md', label = 'Quantité' }: Props) {
  const h = size === 'sm' ? 'h-9' : 'h-11';
  const w = size === 'sm' ? 'w-9' : 'w-11';
  return (
    <div
      className={cn('inline-flex items-center rounded-md border border-sage-dark bg-white', h)}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className={cn(
          'grid h-full place-items-center rounded-l-md text-ink transition hover:text-forest disabled:opacity-40',
          w,
        )}
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label="Diminuer la quantité"
      >
        <Minus className="size-4" />
      </button>
      <span className="min-w-8 text-center text-sm font-bold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={cn(
          'grid h-full place-items-center rounded-r-md text-ink transition hover:text-forest disabled:opacity-40',
          w,
        )}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Augmenter la quantité"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
