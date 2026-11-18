import { motion } from 'motion/react';
import { cn } from '@/utils/text';

/** Interrupteur accessible (activer, publier, rendre disponible). */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors disabled:opacity-50',
        checked ? 'bg-forest' : 'bg-sage-dark',
      )}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className={cn('size-5 rounded-full bg-white shadow-sm', checked && 'ml-auto')}
      />
    </button>
  );
}
