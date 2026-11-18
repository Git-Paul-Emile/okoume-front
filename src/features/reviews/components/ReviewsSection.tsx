import { Camera, Flag, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Rating } from '@/components/ui/Rating';
import { useCurrentUser } from '@/features/auth/auth.queries';
import { formatDate } from '@/utils/formatDate';
import { cn } from '@/utils/text';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { useMyOrders } from '@/features/orders/orders.queries';
import { useMyReview, useProductReviews } from '../reviews.queries';
import { ReportReviewDialog } from './ReportReviewDialog';
import { ReviewForm } from './ReviewForm';

export function ReviewsSection({ productId, productName }: { productId: string; productName: string }) {
  const { data: reviews = [], isLoading } = useProductReviews(productId);
  const [reporting, setReporting] = useState<string | null>(null);
  const [stars, setStars] = useState<number | null>(null);
  const [withPhoto, setWithPhoto] = useState(false);
  const { user } = useCurrentUser();

  const stats = useMemo(() => {
    const dist = [5, 4, 3, 2, 1].map((n) => ({ n, count: reviews.filter((r) => r.rating === n).length }));
    const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    return { dist, average };
  }, [reviews]);

  const shown = reviews.filter((r) => (stars ? r.rating === stars : true) && (withPhoto ? r.photos.length > 0 : true));

  if (isLoading) return <div className="skeleton h-40" />;
  if (!reviews.length)
    return (
      <div className="rounded-lg border border-dashed border-sage-dark p-8 text-center">
        <p className="font-semibold">Aucun avis pour le moment</p>
        <p className="mt-1 text-sm text-ink-soft">
          Seuls les clients ayant reçu ce produit peuvent publier un avis, après validation par notre équipe.
        </p>
        <div className="mt-4 flex justify-center">
          <WriteReview productId={productId} productName={productName} />
        </div>
      </div>
    );

  return (
    <div className="grid gap-8 md:grid-cols-[280px_1fr]">
      <div>
        <p className="text-5xl font-extrabold">{stats.average.toFixed(1).replace('.', ',')}</p>
        <Rating className="mt-2" value={stats.average} size={18} />
        <p className="mt-1 text-sm text-ink-muted">{reviews.length} avis vérifiés</p>
        <ul className="mt-5 space-y-1.5">
          {stats.dist.map(({ n, count }) => (
            <li key={n}>
              <button
                type="button"
                onClick={() => setStars(stars === n ? null : n)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-sm hover:bg-ivory',
                  stars === n && 'bg-forest-50',
                )}
                aria-pressed={stars === n}
              >
                <span className="flex w-8 items-center gap-0.5">
                  {n} <Star className="size-3 text-gold" fill="currentColor" strokeWidth={0} />
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-sage">
                  <span
                    className="block h-full rounded-full bg-gold transition-all duration-700"
                    style={{ width: `${(count / reviews.length) * 100}%` }}
                  />
                </span>
                <span className="w-6 text-right text-ink-muted tabular-nums">{count}</span>
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setWithPhoto((v) => !v)}
          aria-pressed={withPhoto}
          className={cn(
            'mt-4 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium',
            withPhoto ? 'border-forest bg-forest-50 text-forest' : 'border-sage-dark hover:border-forest',
          )}
        >
          <Camera className="size-4" /> Avec photo
        </button>
        <div className="mt-6 border-t border-sage pt-5">
          <WriteReview productId={productId} productName={productName} />
        </div>
      </div>
      <ul className="divide-y divide-sage">
        {shown.length === 0 && <li className="py-4 text-ink-soft">Aucun avis ne correspond à ce filtre.</li>}
        {shown.map((r) => (
          <li key={r.id} className="py-5 first:pt-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-forest-50 text-sm font-bold text-forest">
                  {r.authorName[0]}
                </span>
                <div>
                  <p className="text-sm font-semibold">{r.authorName}</p>
                  <p className="text-xs text-ink-muted">{formatDate(r.createdAt)} · Achat vérifié</p>
                </div>
              </div>
              <Rating value={r.rating} size={14} />
            </div>
            {r.comment && <p className="mt-3 text-[15px] text-ink-soft">{r.comment}</p>}
            {r.photos.length > 0 && (
              <div className="mt-3 flex gap-2">
                {r.photos.map((p) => (
                  <img
                    key={p}
                    src={p}
                    alt="Photo jointe à l’avis"
                    className="size-20 rounded-md border border-sage bg-white object-contain p-1"
                    loading="lazy"
                  />
                ))}
              </div>
            )}
            {user && user.id !== r.userId && (
              <button
                type="button"
                onClick={() => setReporting(r.id)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-mure"
              >
                <Flag className="size-3.5" /> Signaler
              </button>
            )}
          </li>
        ))}
      </ul>
      {reporting && user && <ReportReviewDialog reviewId={reporting} onClose={() => setReporting(null)} />}
    </div>
  );
}

/**
 * Accès au dépôt d'avis : réservé aux clients connectés qui ont reçu le produit (commande livrée).
 * Un seul avis par produit, modifiable ; il repasse alors en modération.
 */
function WriteReview({ productId, productName }: { productId: string; productName: string }) {
  const { user, isAuthenticated } = useCurrentUser();
  const { data: orders = [] } = useMyOrders();
  const { data: mine, isLoading } = useMyReview(user?.id, productId);
  const [open, setOpen] = useState(false);
  const received = orders.some((o) => o.status === 'delivered' && o.items.some((i) => i.productId === productId));

  if (!isAuthenticated)
    return (
      <p className="text-sm text-ink-soft">
        Vous avez acheté ce produit ?{' '}
        <Link
          to={`/connexion?retour=${encodeURIComponent(location.pathname)}`}
          className="font-semibold text-forest hover:underline"
        >
          Connectez-vous
        </Link>{' '}
        pour donner votre avis.
      </p>
    );
  if (isLoading || !user) return null;
  if (!received && !mine)
    return <p className="text-sm text-ink-soft">Vous pourrez donner votre avis une fois ce produit reçu.</p>;

  return (
    <div className="space-y-2">
      {mine?.status === 'pending' && <p className="text-sm text-warning">Votre avis est en cours de vérification.</p>}
      {mine?.status === 'rejected' && (
        <p className="text-sm text-ink-soft">
          Votre avis n’a pas été publié
          {mine.rejectionReason ? ` (motif : ${mine.rejectionReason})` : ''}. Vous pouvez le corriger et le renvoyer.
        </p>
      )}
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {mine ? 'Modifier mon avis' : 'Donner mon avis'}
      </Button>
      {open && (
        <ReviewForm
          productId={productId}
          productName={productName}
          existing={mine ?? null}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
