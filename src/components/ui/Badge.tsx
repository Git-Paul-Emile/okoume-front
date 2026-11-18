import type { ReactNode } from 'react';
import { cn } from '@/utils/text';

type Tone = 'forest' | 'mure' | 'neutral' | 'warning' | 'danger' | 'ink';

const tones: Record<Tone, string> = {
  forest: 'bg-forest-50 text-forest',
  mure: 'bg-mure text-white',
  neutral: 'bg-sage text-ink',
  warning: 'bg-[#fbf1dc] text-warning',
  danger: 'bg-danger/10 text-danger',
  ink: 'bg-ink text-white',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-bold', tones[tone], className)}
    >
      {children}
    </span>
  );
}
