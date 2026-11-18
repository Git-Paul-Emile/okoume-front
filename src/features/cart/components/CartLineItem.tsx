import { motion } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { useCartStore } from '@/stores/cartStore';
import { formatPrice } from '@/utils/formatPrice';
import type { CartLine } from '../cart.types';

export function CartLineItem({
  line,
  max,
  compact,
  onNavigate,
}: {
  line: CartLine;
  max?: number;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.25 }}
      className="flex gap-4 overflow-hidden py-4"
    >
      <Link to={`/produit/${line.slug}`} onClick={onNavigate} className="shrink-0">
        <img
          src={line.image}
          alt=""
          width={compact ? 72 : 96}
          height={compact ? 72 : 96}
          className={
            compact
              ? 'size-18 rounded-md border border-sage bg-white object-contain p-1.5'
              : 'size-24 rounded-md border border-sage bg-white object-contain p-2'
          }
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/produit/${line.slug}`}
              onClick={onNavigate}
              className="line-clamp-2 text-sm font-semibold hover:text-forest"
            >
              {line.name}
            </Link>
            <p className="mt-0.5 text-xs text-ink-muted">{line.variantLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => remove(line.key)}
            className="-mt-1 -mr-1 rounded-md p-1.5 text-ink-muted transition hover:bg-mure-50 hover:text-mure"
            aria-label={`Retirer ${line.name} du panier`}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <QuantityStepper
            size="sm"
            value={line.quantity}
            max={max}
            onChange={(q) => setQuantity(line.key, q)}
            label={`Quantité pour ${line.name}`}
          />
          <div className="text-right">
            <p className="text-sm font-bold tabular-nums">{formatPrice(line.unitPrice * line.quantity)}</p>
            {line.originalPrice > line.unitPrice && (
              <p className="text-xs text-ink-muted line-through tabular-nums">
                {formatPrice(line.originalPrice * line.quantity)}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.li>
  );
}
