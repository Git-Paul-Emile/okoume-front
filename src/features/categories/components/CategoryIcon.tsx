import type { ComponentType, SVGProps } from 'react';
import { CookingPot, Dumbbell, LayoutGrid, Shirt, ShoppingBasket, Smartphone, Sofa } from 'lucide-react';
import { BeautyIcon } from '@/components/ui/BeautyIcon';

const icons: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  smartphone: Smartphone,
  shirt: Shirt,
  sofa: Sofa,
  'cooking-pot': CookingPot,
  sparkles: BeautyIcon,
  dumbbell: Dumbbell,
  'shopping-basket': ShoppingBasket,
};

export function CategoryIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = (name && icons[name]) || LayoutGrid;
  return <Icon className={className ?? 'size-[18px]'} aria-hidden="true" />;
}
