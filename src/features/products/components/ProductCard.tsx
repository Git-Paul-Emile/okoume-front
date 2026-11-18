import { motion } from 'motion/react';
import { ShoppingBag } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { Rating } from '@/components/ui/Rating';
import { useAddToCart } from '@/features/cart/useAddToCart';
import { FavoriteButton } from '@/features/favorites/components/FavoriteButton';
import type { RatingStats } from '@/features/reviews/reviews.types';
import { cn } from '@/utils/text';
import type { Product } from '../products.types';
import {
  applyPromotion,
  availableStock,
  defaultVariant,
  discountLabel,
  productInStock,
  productSalePrice,
} from '../products.utils';
import { chooseVariant, findVariant, productOptions, type OptionSelection } from '../variantOptions';
import { ProductCardOptions } from './ProductCardOptions';
import { PriceTag } from './PriceTag';
import { responsiveImage } from '@/utils/responsiveImage';
import { recordProductView } from '../productViews.api';

interface Props {
  product: Product;
  rating?: RatingStats;
  compact?: boolean;
}

export function ProductCard({ product, rating, compact }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const addToCart = useAddToCart();
  const options = useMemo(() => productOptions(product.variants), [product.variants]);
  // Options choisies sur la carte, en partant de la variante affichée par défaut (la moins chère disponible)
  const [selection, setSelection] = useState<OptionSelection>(() => ({ ...defaultVariant(product).attributes }));
  const chosen = options.length ? findVariant(product.variants, selection) : undefined;
  const fallback = productSalePrice(product);
  const price = chosen ? applyPromotion(chosen.price, product.promotion) : fallback.price;
  const original = chosen ? chosen.price : fallback.original;
  // « À partir de » tant qu'aucune variante précise n'est retenue et que les prix diffèrent
  const hasRange = !chosen && new Set(product.variants.map((v) => v.price)).size > 1;
  const inStock = productInStock(product);
  const discount = discountLabel(product.promotion, original);
  const singleVariant = product.variants.length === 1;
  const ready = singleVariant ? defaultVariant(product) : chosen && availableStock(chosen) > 0 ? chosen : undefined;
  const productUrl = `/produit/${product.slug}`;

  const select = (name: string, value: string) => {
    const next = chooseVariant(product.variants, selection, name, value);
    setSelection(next ? { ...next.attributes } : { ...selection, [name]: value });
  };

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-sage bg-white transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]"
    >
      <div className="relative aspect-square overflow-hidden bg-[#fbfaf6]">
        <Link to={`/produit/${product.slug}`} className="block size-full" tabIndex={-1} aria-hidden="true">
          <img
            ref={imgRef}
            {...responsiveImage(
              chosen?.image ?? product.thumbnail,
              '(min-width: 1280px) 20vw, (min-width: 640px) 33vw, 50vw',
            )}
            alt=""
            loading="lazy"
            width={300}
            height={300}
            className={cn(
              'size-full object-contain p-5 transition-transform duration-500 ease-out group-hover:scale-[1.06]',
              !inStock && 'opacity-60 grayscale',
            )}
          />
        </Link>
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
          {discount && <Badge tone="mure">{discount}</Badge>}
          {product.isNew && <Badge tone="forest">Nouveau</Badge>}
          {!inStock && <Badge tone="ink">Indisponible</Badge>}
        </div>
        <FavoriteButton productId={product.id} className="absolute top-3 right-3 z-10" />
        {inStock && (
          <div className="absolute inset-x-3 bottom-3 z-10 flex translate-y-[120%] justify-center opacity-0 transition-all duration-300 ease-out group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 max-md:hidden">
            {ready ? (
              <button
                type="button"
                onClick={() => addToCart(product, ready, 1, imgRef.current)}
                className="inline-flex h-9 max-w-full items-center justify-center gap-1.5 rounded-md bg-forest px-3 text-[13px] font-semibold whitespace-nowrap text-white shadow-md hover:bg-forest-dark"
              >
                <ShoppingBag className="size-4" /> Ajouter au panier
              </button>
            ) : (
              <Link
                to={productUrl}
                className="inline-flex h-9 max-w-full items-center justify-center rounded-md bg-white px-3 text-[13px] font-semibold whitespace-nowrap text-forest shadow-md hover:bg-ivory"
              >
                Choisir une option
              </Link>
            )}
          </div>
        )}
      </div>
      <div className={cn('flex flex-1 flex-col gap-1.5', compact ? 'p-3' : 'p-4')}>
        <h3 className="line-clamp-2 text-sm leading-snug font-semibold text-ink">
          <Link
            to={`/produit/${product.slug}`}
            onClick={() => recordProductView(product.id, 'click')}
            className="after:absolute after:inset-0 after:content-[''] hover:text-forest focus-visible:outline-none"
          >
            {product.name}
          </Link>
        </h3>
        {rating ? (
          <Rating value={rating.average} count={rating.count} size={13} />
        ) : (
          <p className="text-xs text-ink-muted">Aucun avis pour le moment</p>
        )}
        {!singleVariant && (
          <ProductCardOptions options={options} selection={selection} productUrl={productUrl} onChange={select} />
        )}
        <PriceTag className="mt-auto pt-1" size="sm" price={price} original={original} fromPrefix={hasRange} />
      </div>
    </motion.article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-sage bg-white" aria-hidden="true">
      <div className="skeleton aspect-square rounded-none" />
      <div className="space-y-2 p-4">
        <div className="skeleton h-4 w-4/5" />
        <div className="skeleton h-3 w-1/3" />
        <div className="skeleton h-5 w-1/2" />
      </div>
    </div>
  );
}
