import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ButtonLink } from '@/components/ui/Button';
import { useCategories } from '@/features/categories/categories.queries';
import { useProducts } from '@/features/products/products.queries';
import { usePublicPromoCodes } from '@/features/promotions/promotions.queries';
import { AdBanner } from './AdBanner';

/**
 * Comme sur la maquette : encart mûre à gauche, sur toute la hauteur de la colonne de droite
 * (deux bannières de catégorie puis le contenu passé en `children`, ex. « Acheter par catégorie »).
 */
export function PromoBanners({ children }: { children?: ReactNode }) {
  const { data: products } = useProducts();
  const { data: codes } = usePublicPromoCodes();
  const { data: categories } = useCategories();
  // Catégories repérées par leur nom court : leurs identifiants viennent de la base
  const idOf = (slug: string) => categories?.bySlug.get(slug)?.id;
  const sofa = products?.find((p) => p.categoryId === idOf('mobilier'));
  const bag = products?.find((p) => p.slug.includes('sac-en-cuir'));
  const blender = products?.find((p) => p.categoryId === idOf('cuisine') && p.featured);
  const code = codes?.find((c) => c.freeDelivery) ?? codes?.[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Colonne de gauche : encart « Livraison offerte » (moitié haute) puis espace publicitaire (moitié basse) */}
      {/* Retrait horizontal pour l'image, avec un espacement vertical resserré. */}
      <div className="flex min-h-0 flex-col gap-2">
        <motion.div
          whileHover={{ y: -3 }}
          className="relative min-h-56 flex-1 basis-0 overflow-hidden rounded-lg bg-mure text-white"
        >
          {/* Le contenu est posé en absolu : la carte et l'espace publicitaire se partagent la hauteur à parts égales */}
          <div className="absolute inset-0 flex flex-col p-5">
            {code ? (
              <p className="text-2xl leading-tight font-extrabold">{code.label}</p>
            ) : (
              <p className="text-2xl font-extrabold">Les offres du moment</p>
            )}
            <ButtonLink to="/promotions" variant="light" className="mt-4 w-fit text-mure">
              Voir les promotions
            </ButtonLink>
            {blender && (
              <motion.img
                src={blender.thumbnail}
                alt=""
                className="pointer-events-none mx-auto mt-auto min-h-0 w-full flex-1 object-contain pt-3"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </div>
        </motion.div>
        <AdBanner placement="home-promo-side" variant="side" />
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid flex-1 gap-4 sm:grid-cols-2">
          {[
            {
              p: sofa,
              title: 'Un intérieur qui vous ressemble',
              text: 'Mobilier et décoration',
              to: '/catalogue?categorie=maison',
            },
            {
              p: bag,
              title: 'Sacs et accessoires',
              text: 'Cuir et simili cuir',
              to: '/catalogue?categorie=mode-femme',
            },
          ].map((b) => (
            <Link
              key={b.title}
              to={b.to}
              className="group relative flex min-h-60 overflow-hidden rounded-lg border border-sage bg-ivory-dark p-5"
            >
              <div className="relative z-10 max-w-[55%]">
                <h3 className="text-lg leading-tight">{b.title}</h3>
                <p className="mt-1 text-xs text-ink-soft">{b.text}</p>
                <span className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-md bg-forest px-3 text-xs font-semibold text-white">
                  Explorer
                </span>
              </div>
              {b.p && (
                <img
                  src={b.p.thumbnail}
                  alt=""
                  loading="lazy"
                  className="absolute right-2 bottom-2 h-[85%] w-[48%] object-contain transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3"
                />
              )}
            </Link>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}
