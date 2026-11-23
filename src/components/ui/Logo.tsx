import { brand } from '@/config/brand';
import { cn } from '@/utils/text';

export function LogoMark({ tone = 'dark', className }: { tone?: 'dark' | 'light'; className?: string }) {
  return (
    <img
      src={tone === 'light' ? '/brand/okoza-mark-light.png' : '/brand/okoza-mark.png'}
      className={cn('size-10 object-contain', className)}
      alt=""
      aria-hidden="true"
    />
  );
}

export function Logo({ tone = 'dark', compact = false }: { tone?: 'dark' | 'light'; compact?: boolean }) {
  const image = tone === 'light' ? '/brand/okoza-logo-light.png' : '/brand/okoza-logo.png';

  return (
    <span className={cn('inline-flex flex-col items-start', compact ? 'gap-0' : 'gap-1')}>
      <img
        src={image}
        alt={brand.name}
        className={cn('block h-auto object-contain', compact ? 'w-28' : 'w-36 sm:w-40')}
      />
      {!compact && (
        <span
          className={cn(
            'block text-[11px] font-medium leading-none',
            tone === 'light' ? 'text-white/70' : 'text-ink-muted',
          )}
        >
          {brand.tagline}
        </span>
      )}
    </span>
  );
}
