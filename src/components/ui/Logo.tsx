import { brand } from '@/config/brand';
import { cn } from '@/utils/text';

/** Logo provisoire : une feuille d'okoumé stylisée. À remplacer par le logo définitif. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('size-10', className)} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#2F6C55" />
      <path d="M32 12c-9 8-14 16-14 24a14 14 0 0 0 28 0c0-8-5-16-14-24Z" fill="#F7F2E8" />
      <path d="M32 22v30M32 34l-7-6M32 42l8-7" stroke="#2F6C55" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="46" cy="18" r="5" fill="#A64D73" />
    </svg>
  );
}

export function Logo({ tone = 'dark', compact = false }: { tone?: 'dark' | 'light'; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark className={compact ? 'size-9' : 'size-10'} />
      <span className="leading-none">
        <span
          className={cn('block text-xl font-extrabold tracking-tight', tone === 'light' ? 'text-white' : 'text-ink')}
        >
          {brand.name}
        </span>
        {!compact && (
          <span
            className={cn('mt-1 block text-[11px] font-medium', tone === 'light' ? 'text-white/70' : 'text-ink-muted')}
          >
            {brand.tagline}
          </span>
        )}
      </span>
    </span>
  );
}
