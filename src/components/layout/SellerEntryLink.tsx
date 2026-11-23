import { Link } from 'react-router';
import { useCurrentUser } from '@/features/auth/auth.queries';
import { useSellerShop } from '@/features/seller/seller.queries';
import { cn } from '@/utils/text';

/** Entrée d'acquisition pour le public, accès opérationnel dès qu'une boutique existe. */
export function SellerEntryLink({ className, mobile = false }: { className?: string; mobile?: boolean }) {
  const { isAuthenticated } = useCurrentUser();
  const { data: shop } = useSellerShop();
  const isSeller = isAuthenticated && !!shop;

  return (
    <Link
      to={isSeller ? '/vendeur' : '/devenir-vendeur'}
      className={cn(
        mobile
          ? 'block rounded-md border border-forest/20 bg-forest-50 px-3 py-3 font-semibold text-forest hover:bg-forest-100'
          : 'inline-flex h-10 items-center rounded-md border border-forest/30 bg-white px-4 text-sm font-bold text-forest transition hover:bg-forest-50',
        className,
      )}
    >
      {isSeller ? 'Espace vendeur' : 'Devenir vendeur'}
    </Link>
  );
}
