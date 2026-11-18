import { BadgeCheck, Flag, MapPin, MessageCircle, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { ApiError, getErrorMessage } from '@/api/ApiError';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { brand } from '@/config/brand';
import { useCurrentUser } from '@/features/auth/auth.queries';
import { ListingRequestDialog } from '@/features/marketplace/components/ListingRequestDialog';
import { ReportListingDialog } from '@/features/marketplace/components/ReportListingDialog';
import { ShareListing } from '@/features/marketplace/components/ShareListing';
import { conditionLabel, handoverLabel, paymentLabel } from '@/features/marketplace/marketplace.backend';
import { useListing, useOpenConversation, usePublicShop } from '@/features/marketplace/marketplace.queries';
import { toast } from '@/stores/toastStore';
import { formatDate } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/text';

/** Fiche d'une annonce (32.4) : photos, prix, état, lieu, boutique ; tchat, demande, partage et signalement. */
export default function ListingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, isAuthenticated } = useCurrentUser();
  const listing = useListing(slug);
  const shop = usePublicShop(listing.data?.shop.slug);
  const openChat = useOpenConversation();
  const [photo, setPhoto] = useState(0);
  const [dialog, setDialog] = useState<'request' | 'report' | null>(null);

  const data = listing.data;
  useEffect(() => {
    if (data) document.title = `${brand.name} : ${data.title}`;
  }, [data]);

  if (listing.isLoading) return <PageLoader />;
  if (listing.isError || !data) {
    const missing = listing.error instanceof ApiError && listing.error.isNotFound;
    return (
      <div className="container-page py-10">
        <ErrorState
          title={missing ? 'Annonce introuvable ou retirée' : 'Impossible d’afficher l’annonce'}
          error={missing ? undefined : listing.error}
          onRetry={missing ? undefined : () => void listing.refetch()}
        />
      </div>
    );
  }

  /** Les échanges avec le vendeur demandent un compte : retour à l'annonce après connexion. */
  const signedIn = () => {
    if (isAuthenticated) return true;
    navigate(`/connexion?retour=${encodeURIComponent(pathname)}`);
    return false;
  };

  const contact = () => {
    if (!signedIn()) return;
    openChat.mutate(data.slug, {
      onSuccess: (conversation) => navigate(`/compte/messages/${conversation.id}`),
      onError: (err) => toast.error('Tchat indisponible', { description: getErrorMessage(err) }),
    });
  };

  const place = [data.district, data.city].filter(Boolean).join(', ');
  const current = data.photos[photo] ?? data.photos[0];

  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs
        items={[{ label: 'Accueil', to: '/' }, { label: 'Annonces', to: '/annonces' }, { label: data.title }]}
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <section aria-label="Photos">
          <div className="overflow-hidden rounded-lg border border-sage bg-[#fbfaf6]">
            <img
              src={current}
              alt={data.title}
              className={cn('aspect-square w-full object-contain', data.sold && 'opacity-60 grayscale')}
            />
          </div>
          {data.photos.length > 1 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {data.photos.map((src, i) => (
                <li key={src}>
                  <button
                    type="button"
                    onClick={() => setPhoto(i)}
                    aria-label={`Photo ${i + 1}`}
                    aria-pressed={i === photo}
                    className={cn(
                      'size-16 overflow-hidden rounded-md border-2',
                      i === photo ? 'border-forest' : 'border-sage',
                    )}
                  >
                    <img src={src} alt="" className="size-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 space-y-3">
            <h2 className="text-lg">Description</h2>
            <p className="whitespace-pre-line text-ink-soft">{data.description}</p>
          </div>
        </section>

        <aside className="space-y-5 lg:sticky lg:top-36 lg:self-start">
          <div className="card space-y-3 p-5">
            {data.sold && <Badge tone="ink">Vendu : la fiche reste consultable</Badge>}
            <h1 className="text-2xl leading-tight">{data.title}</h1>
            <p className="text-2xl font-bold tabular-nums">{formatPrice(data.price)}</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-ink-muted">Type</dt>
              <dd>{data.kind === 'service' ? 'Service' : 'Produit'}</dd>
              {data.condition && (
                <>
                  <dt className="text-ink-muted">État</dt>
                  <dd>{conditionLabel[data.condition]}</dd>
                </>
              )}
              {data.kind === 'product' && data.quantity !== null && (
                <>
                  <dt className="text-ink-muted">Disponible</dt>
                  <dd>{data.quantity}</dd>
                </>
              )}
              <dt className="text-ink-muted">Catégorie</dt>
              <dd>{data.category.label}</dd>
              {data.publishedAt && (
                <>
                  <dt className="text-ink-muted">Publiée le</dt>
                  <dd>{formatDate(data.publishedAt)}</dd>
                </>
              )}
            </dl>
            <p className="flex items-center gap-1.5 text-sm text-ink-soft">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              {place}
            </p>
            {!data.sold && (
              <div className="grid gap-2 pt-2">
                <Button icon={<MessageCircle className="size-4" />} loading={openChat.isPending} onClick={contact}>
                  Contacter le vendeur
                </Button>
                <Button
                  variant="outline"
                  icon={<ShoppingBag className="size-4" />}
                  disabled={!shop.data}
                  onClick={() => signedIn() && setDialog('request')}
                >
                  Demander à acheter
                </Button>
              </div>
            )}
          </div>

          <div className="card space-y-2 p-5 text-sm">
            <p className="flex items-center gap-1.5 font-semibold">
              {data.shop.name}
              {data.shop.verified && <BadgeCheck className="size-4 text-forest" aria-hidden="true" />}
            </p>
            {data.shop.verified && <p className="text-xs text-forest">Boutique vérifiée par Okoumé</p>}
            {shop.data && (
              <>
                {shop.data.description && <p className="text-ink-soft">{shop.data.description}</p>}
                <p className="text-ink-muted">
                  Paiement : {shop.data.acceptedPaymentMethods.map((m) => paymentLabel[m]).join(', ')}.
                </p>
                <p className="text-ink-muted">
                  Remise : {shop.data.handoverModes.map((m) => handoverLabel[m].toLowerCase()).join(' ou ')}.
                </p>
              </>
            )}
          </div>

          <div className="space-y-3">
            <ShareListing listing={data} />
            <button
              type="button"
              onClick={() => signedIn() && setDialog('report')}
              className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-danger hover:underline"
            >
              <Flag className="size-4" aria-hidden="true" />
              Signaler l’annonce
            </button>
          </div>
        </aside>
      </div>

      {dialog === 'request' && shop.data && (
        <ListingRequestDialog
          listing={data}
          shop={shop.data}
          defaultPhone={user?.phone ?? ''}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'report' && <ReportListingDialog slug={data.slug} onClose={() => setDialog(null)} />}
    </div>
  );
}
