import { BadgeCheck, MapPin } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/text';
import { conditionLabel, type Listing } from '../marketplace.backend';
import { distanceLabel } from '../marketplace.utils';

/** Carte d'annonce : photo, titre, prix, état, lieu, boutique ; « Sponsorisé » pour une annonce mise en avant. */
export function ListingCard({ listing }: { listing: Listing }) {
  const url = `/annonces/${listing.slug}`;
  const place = [listing.district, listing.city].filter(Boolean).join(', ');
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-sage bg-white transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]">
      <div className="relative aspect-square overflow-hidden bg-[#fbfaf6]">
        <img
          src={listing.photos[0]}
          alt=""
          loading="lazy"
          width={300}
          height={300}
          className={cn('size-full object-cover', listing.sold && 'opacity-60 grayscale')}
        />
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
          {listing.sold && <Badge tone="ink">Vendu</Badge>}
          {listing.sponsored && <Badge tone="warning">Sponsorisé</Badge>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-2 text-base leading-snug">
          {/* Toute la carte est cliquable, le lien reste le titre pour les lecteurs d'écran */}
          <Link to={url} className="after:absolute after:inset-0 hover:text-forest">
            {listing.title}
          </Link>
        </h3>
        <p className="text-lg font-bold tabular-nums">{formatPrice(listing.price)}</p>
        <p className="text-xs text-ink-muted">
          {listing.kind === 'service' ? 'Service' : listing.condition ? conditionLabel[listing.condition] : 'Produit'}
          {', '}
          {listing.category.label}
        </p>
        <p className="mt-auto flex items-center gap-1 pt-2 text-xs text-ink-soft">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {listing.distanceKm !== null ? `${distanceLabel(listing.distanceKm)}, ` : ''}
            {place}
          </span>
        </p>
        <p className="flex items-center gap-1 text-xs font-semibold text-ink">
          <span className="truncate">{listing.shop.name}</span>
          {listing.shop.verified && (
            <BadgeCheck className="size-4 shrink-0 text-forest" aria-label="Boutique vérifiée" role="img" />
          )}
        </p>
      </div>
    </article>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-sage bg-white" aria-hidden="true">
      <div className="aspect-square animate-pulse bg-sage/50" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-4/5 animate-pulse rounded bg-sage/60" />
        <div className="h-5 w-1/3 animate-pulse rounded bg-sage/60" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-sage/40" />
      </div>
    </div>
  );
}
