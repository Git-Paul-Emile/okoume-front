import { cn } from '@/utils/text';
import { swatchColor } from '../variantOptions';

interface Props {
  value: string;
  selected?: boolean;
  available?: boolean;
  size?: 'sm' | 'md';
  onSelect?: () => void;
}

/**
 * Pastille de couleur. Le nom reste accessible (infobulle, lecteur d'écran) : la couleur n'est jamais la seule
 * information. Une couleur inconnue de la table s'affiche en motif neutre. Une couleur épuisée est barrée.
 */
export function ColorSwatch({ value, selected = false, available = true, size = 'sm', onSelect }: Props) {
  const color = swatchColor(value);
  const dimension = size === 'sm' ? 'size-5' : 'size-8';
  const label = available ? value : `${value} (indisponible)`;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      title={label}
      onClick={onSelect}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full border border-sage-dark transition-shadow',
        dimension,
        selected ? 'ring-2 ring-forest ring-offset-2' : 'hover:ring-2 hover:ring-sage-dark hover:ring-offset-1',
        !available && 'opacity-50',
      )}
      style={
        color
          ? { backgroundColor: color }
          : { backgroundImage: 'repeating-linear-gradient(45deg, #e8e4d8 0 3px, #ffffff 3px 6px)' }
      }
    >
      {!available && (
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 -rotate-45 bg-ink" />
      )}
    </button>
  );
}
