import { ArrowRight } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { useCurrentUser } from '@/features/auth/auth.queries';
import { useSellerShop } from '@/features/seller/seller.queries';

export function SellerCallout() {
  const { isAuthenticated } = useCurrentUser();
  const { data: shop } = useSellerShop();
  const isSeller = isAuthenticated && !!shop;

  return (
    <section className="overflow-hidden rounded-xl bg-white">
      <div className="p-6 sm:p-8">
        <p className="text-sm font-semibold text-forest">Vous êtes commerçant ?</p>
        <h2 className="mt-1 text-2xl sm:text-3xl">{isSeller ? 'Gérez votre boutique OKOZA' : 'Développez votre activité avec OKOZA'}</h2>
        <p className="mt-3 max-w-2xl text-ink-soft">
          {isSeller
            ? 'Retrouvez vos produits, vos commandes et les réglages de votre vitrine dans votre espace vendeur.'
            : 'Rejoignez notre marketplace, créez votre boutique en ligne et proposez vos produits à de nouveaux clients.'}
        </p>
        <ButtonLink
          to={isAuthenticated ? '/vendeur' : '/inscription?retour=%2Fvendeur'}
          className="mt-5"
          icon={<ArrowRight className="size-4" />}
        >
          {isSeller ? 'Espace vendeur' : 'Créer ma boutique'}
        </ButtonLink>
        {!isSeller && <p className="mt-3 text-xs text-ink-muted">Inscrivez-vous et commencez à vendre sur OKOZA.</p>}
      </div>
    </section>
  );
}
