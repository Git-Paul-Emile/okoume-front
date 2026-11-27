import { PackageX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { brand } from '@/config/brand';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Tabs } from '@/components/ui/Tabs';
import { useCategories } from '@/features/categories/categories.queries';
import { ancestors } from '@/features/categories/categories.utils';
import { ProductBuyBox } from '@/features/products/components/ProductBuyBox';
import { ProductCard } from '@/features/products/components/ProductCard';
import { ProductGallery } from '@/features/products/components/ProductGallery';
import { useProduct, useProductsByIds } from '@/features/products/products.queries';
import type { Variant } from '@/features/products/products.types';
import { defaultVariant } from '@/features/products/products.utils';
import { ReviewsSection } from '@/features/reviews/components/ReviewsSection';
import { useRatingStats } from '@/features/reviews/reviews.queries';
import { useRecentlyViewedStore } from '@/stores/recentlyViewedStore';

type Tab = 'description' | 'specs' | 'tips';

export default function ProductPage() {
  const { slug = '' } = useParams();
  const { data: product, isLoading, error, refetch } = useProduct(slug);
  const { data: categories } = useCategories();
  const { data: ratings } = useRatingStats();
  const { data: related } = useProductsByIds(product?.relatedIds ?? []);
  const pushRecentlyViewed = useRecentlyViewedStore((state) => state.push);
  // Variante choisie, rattachée au produit : changer de produit revient à sa variante par défaut
  const [choice, setChoice] = useState<{ productId: string; variantId: string } | null>(null);
  const [tab, setTab] = useState<Tab>('description');

  useEffect(() => {
    if (!product) return;
    document.title = `${brand.name} : ${product.name}`;
  }, [product]);

  useEffect(() => {
    if (product) pushRecentlyViewed(product.id);
  }, [product, pushRecentlyViewed]);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!product)
    return (
      <EmptyState
        icon={<PackageX className="size-7" />}
        title="Ce produit n’existe pas ou n’est plus en vente"
        description="Il a peut-être été retiré du catalogue."
        action={<ButtonLink to="/catalogue">Parcourir le catalogue</ButtonLink>}
      />
    );

  const current =
    (choice?.productId === product.id && product.variants.find((v) => v.id === choice.variantId)) ||
    defaultVariant(product);
  const trail = categories ? ancestors(product.categoryId, categories.byId).reverse() : [];
  const tabs = [
    { value: 'description' as const, label: 'Description' },
    { value: 'specs' as const, label: 'Caractéristiques' },
    ...(product.usageTips ? [{ value: 'tips' as const, label: 'Conseils d’utilisation' }] : []),
  ];

  return (
    <div className="container-page py-6 lg:py-8" data-product-page>
      <Breadcrumbs
        items={[
          { label: 'Accueil', to: '/' },
          ...trail.map((c) => ({ label: c.name, to: `/catalogue?categorie=${c.id}` })),
          { label: product.name },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div data-gallery className="lg:sticky lg:top-36 lg:self-start">
          <ProductGallery images={product.images} name={product.name} activeImage={current.image} />
        </div>
        <ProductBuyBox
          product={product}
          variant={current}
          onVariantChange={(v: Variant) => setChoice({ productId: product.id, variantId: v.id })}
          rating={ratings?.get(product.id)}
        />
      </div>

      <section className="mt-12">
        <div className="border-b border-sage">
          <Tabs label="Informations produit" value={tab} onChange={setTab} options={tabs} />
        </div>
        <div className="card mt-4 p-6">
          {tab === 'description' && (
            <div className="prose-shop max-w-3xl">
              {product.description.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          )}
          {tab === 'specs' && (
            <dl className="grid max-w-2xl divide-y divide-sage">
              {[
                ...product.specs,
                { label: 'Référence produit', value: product.sku },
                ...(current.label !== 'Standard' ? [{ label: 'Variante', value: current.label }] : []),
                ...(current.weightGrams
                  ? [
                      {
                        label: 'Poids',
                        value:
                          current.weightGrams >= 1000
                            ? `${(current.weightGrams / 1000).toLocaleString('fr-FR')} kg`
                            : `${current.weightGrams} g`,
                      },
                    ]
                  : []),
                ...(current.dimensions
                  ? [
                      {
                        label: 'Dimensions',
                        value: `${current.dimensions.length} × ${current.dimensions.width} × ${current.dimensions.height} cm`,
                      },
                    ]
                  : []),
              ].map((s) => (
                <div key={s.label} className="grid grid-cols-[160px_1fr] gap-4 py-2.5 text-sm">
                  <dt className="font-semibold">{s.label}</dt>
                  <dd className="text-ink-soft">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {tab === 'tips' && <p className="max-w-3xl text-ink-soft">{product.usageTips}</p>}
        </div>
      </section>

      <section id="avis" className="mt-12 scroll-mt-40">
        <SectionHeading title="Avis clients" />
        <div className="card p-6">
          <ReviewsSection productId={product.id} productName={product.name} />
        </div>
      </section>

      {related && related.length > 0 && (
        <Reveal className="mt-12">
          <SectionHeading title="Vous aimerez aussi" />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} rating={ratings?.get(p.id)} />
            ))}
          </div>
        </Reveal>
      )}

      <div className="mt-12">
      </div>
    </div>
  );
}
