import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/text';

interface Props {
  price: number;
  original?: number;
  size?: 'sm' | 'md' | 'lg';
  fromPrefix?: boolean;
  className?: string;
}

export function PriceTag({ price, original, size = 'md', fromPrefix, className }: Props) {
  const discounted = original !== undefined && original > price;
  const main = { sm: 'text-[15px]', md: 'text-lg', lg: 'text-3xl' }[size];
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-0.5', className)}>
      <span className={cn('font-extrabold tabular-nums', main, discounted ? 'text-mure' : 'text-ink')}>
        {fromPrefix && <span className="mr-1 text-xs font-medium text-ink-muted">à partir de</span>}
        {formatPrice(price)}
      </span>
      {discounted && (
        <span className="text-sm text-ink-muted tabular-nums line-through">
          <span className="sr-only">Prix initial : </span>
          {formatPrice(original)}
        </span>
      )}
    </div>
  );
}
