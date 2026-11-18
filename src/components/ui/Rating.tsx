import { Star } from 'lucide-react';
import { cn } from '@/utils/text';

export function Rating({
  value,
  count,
  size = 14,
  className,
}: {
  value: number;
  count?: number;
  size?: number;
  className?: string;
}) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="flex" role="img" aria-label={`Note moyenne ${value.toFixed(1).replace('.', ',')} sur 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="relative" style={{ width: size, height: size }}>
            <Star
              className="absolute inset-0 text-sage-dark"
              fill="currentColor"
              strokeWidth={0}
              style={{ width: size, height: size }}
            />
            {rounded >= i - 0.5 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: rounded >= i ? '100%' : '50%' }}>
                <Star className="text-gold" fill="currentColor" strokeWidth={0} style={{ width: size, height: size }} />
              </span>
            )}
          </span>
        ))}
      </div>
      {count !== undefined && <span className="text-xs text-ink-muted">({count})</span>}
    </div>
  );
}
