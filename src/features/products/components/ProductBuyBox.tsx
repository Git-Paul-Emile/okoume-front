import { motion } from 'motion/react';
import { ShoppingBag, Store, Truck } from 'lucide-react';
import { Link } from 'react-router';
import { useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { Rating } from '@/components/ui/Rating';
import { useAddToCart } from '@/features/cart/useAddToCart';
import { useDeliveryZones } from '@/features/delivery/delivery.queries';
import type { RatingStats } from '@/features/reviews/reviews.types';
import { formatDate } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/text';
import type { Product, Variant } from '../products.types';
import { conditionLabel } from '../products.utils';
import {
  applyPromotion,
  availabilityLabel,
  availableStock,
  discountLabel,
  isPromotionActive,
  variantAvailability,
} from '../products.utils';
import { PriceTag } from './PriceTag';
import { VariantSelector } from './VariantSelector';

interface Props {
  product: Product;
  variant: Variant;
  onVariantChange: (v: Variant) => void;
  rating?: RatingStats;
}

const availabilityColor = { in_stock: 'text-forest', low_stock: 'text-warning', out_of_stock: 'text-danger' };

export function ProductBuyBox({ product, variant, onVariantChange, rating }: Props) {
  const [qty, setQty] = useState(1);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const addToCart = useAddToCart();
  const { data: zones } = useDeliveryZones();

  const price = applyPromotion(variant.price, product.promotion);
  const availability = variantAvailability(variant);
  const stock = availableStock(variant);
  const discount = discountLabel(product.promotion, variant.price);
  const promoActive = isPromotionActive(product.promotion);
  const fees = zones?.filter((z) => z.available).map((z) => z.fee) ?? [];

  return (
    <div>
      <h1 className="text-2xl leading-tight sm:text-3xl">{product.name}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-muted">
        {rating ? (
          <a href="#avis" className="flex items-center gap-1.5 hover:text-forest">
            <Rating value={rating.average} size={15} />
            <span>
              {rating.average.toFixed(1).replace('.', ',')} · {rating.count} avis
            </span>
          </a>
        ) : (
          <span>Aucun avis pour le moment</span>
        )}
        <span>Réf. {variant.sku}</span>
        {product.brand && <span>Marque : {product.brand}</span>}
      </div>

      {/* Qui vend (32.1) : la boutique OKOZA ou la boutique d'un vendeur inscrit */}
      <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <Store className="size-4 text-forest" aria-hidden />
        {product.seller ? (
          <>
            Vendu par{' '}
            <Link to={`/boutiques/${product.seller.slug}`} className="font-semibold text-forest hover:underline">
              {product.seller.name}
            </Link>
          </>
        ) : (
          <span>
            Vendu par <span className="font-semibold">OKOZA</span>
          </span>
        )}
        {product.condition && product.condition !== 'new' && (
          <Badge tone="neutral">{conditionLabel(product.condition)}</Badge>
        )}
      </p>

      <p className="mt-4 text-ink-soft">{product.shortDescription}</p>

      <div className="mt-5 rounded-lg bg-ivory p-4">
        <div className="flex flex-wrap items-center gap-3">
          <motion.div key={price} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <PriceTag price={price} original={variant.price} size="lg" />
          </motion.div>
          {discount && <Badge tone="mure">{discount}</Badge>}
        </div>
        {promoActive && price < variant.price && (
          <p className="mt-1.5 text-sm font-medium text-mure">
            Vous économisez {formatPrice(variant.price - price)} · jusqu’au {formatDate(product.promotion!.endsAt)}
          </p>
        )}
      </div>

      <div className="mt-5 space-y-5">
        <VariantSelector
          variants={product.variants}
          selectedId={variant.id}
          onSelect={(v) => {
            onVariantChange(v);
            setQty(1);
          }}
        />

        <p
          className={cn('flex items-center gap-2 text-sm font-semibold', availabilityColor[availability])}
          aria-live="polite"
        >
          {availabilityLabel[availability]}
          {availability === 'low_stock' && (
            <span className="font-normal text-ink-soft">: plus que {stock} en stock</span>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {availability !== 'out_of_stock' && <QuantityStepper value={qty} onChange={setQty} max={stock} />}
          <Button
            ref={buttonRef}
            size="lg"
            className="min-w-0 flex-1"
            disabled={availability === 'out_of_stock'}
            icon={<ShoppingBag className="size-5" />}
            onClick={() =>
              addToCart(
                product,
                variant,
                qty,
                buttonRef.current?.closest('[data-product-page]')?.querySelector('[data-gallery] img') ??
                  buttonRef.current,
              )
            }
          >
            {availability === 'out_of_stock' ? 'Indisponible' : 'Ajouter au panier'}
          </Button>
        </div>
      </div>

      <ul className="mt-6 divide-y divide-sage rounded-lg border border-sage text-sm">
        <li className="flex gap-3 p-4">
          <Truck className="mt-0.5 size-5 shrink-0 text-forest" />
          <div>
            <p className="font-semibold">Livraison à domicile</p>
            <p className="text-ink-soft">
              {fees.length
                ? `De ${formatPrice(Math.min(...fees))} à ${formatPrice(Math.max(...fees))} selon le quartier, délai indicatif 24 à 72 h. `
                : ''}
            </p>
          </div>
        </li>
      </ul>
    </div>
  );
}
