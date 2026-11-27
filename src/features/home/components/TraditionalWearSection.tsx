import { Link } from 'react-router';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ProductCard, ProductCardSkeleton } from '@/features/products/components/ProductCard';
import { useCategories } from '@/features/categories/categories.queries';
import { useProducts } from '@/features/products/products.queries';
import { productInStock } from '@/features/products/products.utils';
import { useRatingStats } from '@/features/reviews/reviews.queries';
import { FridayPopOut } from './FridayPopOut';

const CATEGORY = 'traditionnel';

/** « Tenues traditionnelles » : le vendredi, on s'habille en tenue africaine dans les administrations. */
export function TraditionalWearSection() {
  const { data: products, isLoading } = useProducts();
  const { data: ratings } = useRatingStats();
  const { data: categories } = useCategories();
  // Quatre tenues homme puis quatre tenues femme (deux rangées), disponibles et récentes d'abord
  // Catégories repérées par leur nom court : leurs identifiants viennent de la base
  const pick = (slug: string) =>
    (products ?? [])
      .filter((p) => p.categoryId === categories?.bySlug.get(slug)?.id)
      .sort((a, b) => Number(productInStock(b)) - Number(productInStock(a)) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 4);
  const items = [...pick('tradi-homme'), ...pick('tradi-femme')];
  if (!isLoading && categories && !items.length) return null;

  return (
    <section aria-labelledby="tradi-title">
      <SectionHeading
        title="Tenues traditionnelles"
        link={{ to: `/catalogue?categorie=${CATEGORY}`, label: 'Voir la collection' }}
      />
      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="flex flex-col justify-center gap-4 rounded-lg bg-forest p-6 text-white">
          <div>
            <h3 id="tradi-title" className="text-2xl leading-tight text-white">
              Prêt pour le vendredi ?
            </h3>
            <p className="mt-3 text-sm text-white/85">
              Le vendredi, on s’habille en tenue traditionnelle au bureau. Chemises, vestes, robes et ensembles en
              pagne, pour hommes et femmes.
            </p>
          </div>
          <FridayPopOut />
          <div className="flex flex-col gap-2">
            <Link
              to="/catalogue?categorie=tradi-homme"
              className="inline-flex h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-forest transition-colors hover:bg-ivory"
            >
              Tenues homme
            </Link>
            <Link
              to="/catalogue?categorie=tradi-femme"
              className="inline-flex h-11 items-center justify-center rounded-md border border-white/60 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Tenues femme
            </Link>
          </div>
        </div>
        <RevealGroup gap={0.05} className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {isLoading
            ? Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)
            : items.map((p) => (
                <RevealItem key={p.id}>
                  <ProductCard product={p} rating={ratings?.get(p.id)} />
                </RevealItem>
              ))}
        </RevealGroup>
      </div>
    </section>
  );
}
