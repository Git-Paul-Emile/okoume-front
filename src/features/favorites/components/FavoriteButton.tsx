import { motion } from 'motion/react';
import { Heart } from 'lucide-react';
import type { Id } from '@/api/types';
import { cn } from '@/utils/text';
import { useFavorites } from '../useFavorites';

export function FavoriteButton({ productId, className }: { productId: Id; className?: string }) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(productId);
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.85 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
      className={cn(
        'grid size-9 place-items-center transition-colors hover:text-mure',
        active ? 'text-mure' : 'text-ink-soft',
        className,
      )}
      aria-pressed={active}
      aria-label={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <motion.span
        key={String(active)}
        initial={{ scale: active ? 0.4 : 1 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
      >
        <Heart className="size-[18px]" fill={active ? 'currentColor' : 'none'} />
      </motion.span>
    </motion.button>
  );
}
