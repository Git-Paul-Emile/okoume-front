import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { getErrorMessage } from '@/api/ApiError';
import { apiFieldErrors } from '@/api/backend';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SelectField, TextAreaField, TextField } from '@/components/ui/TextField';
import { ImageGalleryUpload } from '@/components/ui/Upload';
import { useCategories } from '@/features/categories/categories.queries';
import { CONDITIONS, conditionLabel, type ListingCondition } from '@/features/marketplace/marketplace.backend';
import { shareLink } from '@/features/marketplace/marketplace.utils';
import { MobileMoneyForm } from '@/features/seller/components/MobileMoneyForm';
import {
  decisionLabel,
  listingPhotoUploader,
  listingStatusLabel,
  sellerBackend,
  type ListingFields,
  type SellerListing,
  type SellerShop,
} from '@/features/seller/seller.backend';
import {
  useBoostPlans,
  useBoosts,
  useListingStats,
  useSaveListing,
  useSellerAction,
  useSellerListing,
  useSellerShop,
} from '@/features/seller/seller.queries';
import { toast } from '@/stores/toastStore';
import { formatDate } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';
import { pluralize } from '@/utils/text';

const MAX_PHOTOS = 8;
/** Mêmes états que l'API (listings.rules.ts) ; une annonce en modération ou refusée ne change plus. */
const SUBMITTABLE: SellerListing['status'][] = ['draft', 'changes_requested', 'withdrawn', 'sold'];
const WITHDRAWABLE: SellerListing['status'][] = ['in_review', 'changes_requested', 'published', 'sold'];
const LOCKED: SellerListing['status'][] = ['pending_moderation', 'rejected'];

interface Form {
  title: string;
  description: string;
  categoryId: string;
  kind: 'product' | 'service';
  condition: ListingCondition | '';
  price: string;
  quantity: string;
  city: string;
  district: string;
  photos: string[];
  minPrice: string;
  sellerNotes: string;
}

const formFrom = (listing: SellerListing | null, shop: SellerShop): Form => ({
  title: listing?.title ?? '',
  description: listing?.description ?? '',
  categoryId: listing?.category.id ?? '',
  kind: listing?.kind ?? 'product',
  condition: listing?.condition ?? '',
  price: listing ? String(listing.price) : '',
  quantity: listing?.quantity !== null && listing?.quantity !== undefined ? String(listing.quantity) : '1',
  city: listing?.city ?? shop.city,
  district: listing?.district ?? shop.district ?? '',
  photos: listing?.photos ?? [],
  minPrice: listing?.negotiation.minPrice ? String(listing.negotiation.minPrice) : '',
  sellerNotes: listing?.negotiation.sellerNotes ?? '',
});

const int = (value: string) => {
  const n = Number(value.replace(/\s/g, ''));
  return value.trim() !== '' && Number.isInteger(n) ? n : null;
};

/** Champs vérifiés avant l'envoi ; l'API refait chaque contrôle. */
function validate(v: Form): { fields: ListingFields | null; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const price = int(v.price);
  const quantity = int(v.quantity);
  const minPrice = v.minPrice.trim() ? int(v.minPrice) : null;
  if (v.title.trim().length < 5) errors.title = 'Titre trop court (5 caractères au moins).';
  if (v.description.trim().length < 20)
    errors.description = 'Décrivez l’article en quelques phrases (20 caractères au moins).';
  if (!v.categoryId) errors.categoryId = 'Choisissez une catégorie.';
  if (!price || price < 1) errors.price = 'Prix en FCFA, nombre entier.';
  if (v.kind === 'product' && !v.condition) errors.condition = 'Indiquez l’état du produit.';
  if (v.kind === 'product' && (quantity === null || quantity < 0))
    errors.quantity = 'Quantité disponible, nombre entier.';
  if (v.minPrice.trim() && (!minPrice || (price !== null && minPrice > price)))
    errors.minPrice = 'Prix minimum entier, au plus égal au prix affiché.';
  if (Object.keys(errors).length || price === null) return { fields: null, errors };
  return {
    errors,
    fields: {
      title: v.title.trim(),
      description: v.description.trim(),
      categoryId: v.categoryId,
      kind: v.kind,
      condition: v.kind === 'product' && v.condition ? v.condition : null,
      price,
      quantity: v.kind === 'product' ? quantity : null,
      city: v.city.trim(),
      district: v.district.trim(),
      photos: v.photos,
      minPrice,
      sellerNotes: v.sellerNotes.trim(),
    },
  };
}

function ReviewNotice({ listing }: { listing: SellerListing }) {
  const review = listing.lastReview;
  if (!review || review.outcome === 'approved') return null;
  const title =
    review.outcome === 'changes_requested'
      ? 'Corrections demandées avant publication'
      : review.outcome === 'moderation'
        ? 'Annonce transmise à un modérateur'
        : 'Annonce refusée';
  return (
    <div className="rounded-md bg-[#fbf1dc] p-4 text-sm" role="status">
      <p className="font-semibold text-warning">{title}</p>
      {review.issues.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {review.issues.map((issue, i) => (
            <li key={i}>{issue.message}</li>
          ))}
        </ul>
      )}
      {review.reason && <p className="mt-2 text-ink-soft">{review.reason}</p>}
    </div>
  );
}

/** Mise en avant payante d'une annonce publiée (32.10) et ses demandes. */
function BoostPanel({ listing }: { listing: SellerListing }) {
  const { data: plans = [] } = useBoostPlans();
  const boosts = useBoosts(1);
  const [planId, setPlanId] = useState('');
  const declare = useSellerAction(
    ({ id, payment }: { id: string; payment: Parameters<typeof sellerBackend.declareBoost>[1] }) =>
      sellerBackend.declareBoost(id, payment),
  );
  const plan = plans.find((p) => p.id === planId);
  const mine = (boosts.data?.items ?? []).filter((b) => b.listing.id === listing.id);

  return (
    <section className="card space-y-3 p-5">
      <h2 className="text-lg">Mise en avant</h2>
      <p className="text-sm text-ink-soft">
        L’annonce apparaît en tête des résultats, avec la mention « Sponsorisé », pendant la durée choisie.
      </p>
      {mine.length > 0 && (
        <ul className="space-y-1 text-sm">
          {mine.map((b) => (
            <li key={b.id}>
              {b.plan.name} : {decisionLabel[b.status]}
              {b.endsAt && `, jusqu’au ${formatDate(b.endsAt)}`}
              {b.decisionReason && `. Motif : ${b.decisionReason}`}
            </li>
          ))}
        </ul>
      )}
      <SelectField label="Offre" value={planId} onChange={(e) => setPlanId(e.target.value)}>
        <option value="">Choisissez une durée</option>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} : {p.durationDays} jours, {formatPrice(p.price)}
          </option>
        ))}
      </SelectField>
      {plan && (
        <MobileMoneyForm
          amount={plan.price}
          submitLabel="Déclarer le paiement"
          onSubmit={async (payment) => {
            await declare.mutateAsync({ id: listing.id, payment: { planId: plan.id, ...payment } });
            toast.success('Paiement déclaré', { description: 'La mise en avant démarre après vérification.' });
            setPlanId('');
          }}
        />
      )}
    </section>
  );
}

/** Création ou modification d'une annonce (32.3) : brouillon, photos, vérification, publication. */
export default function SellerListingEditPage() {
  const { id } = useParams();
  const isNew = !id || id === 'nouvelle';
  const { data: shop } = useSellerShop();
  const listing = useSellerListing(isNew ? undefined : id);
  if (!shop || (!isNew && listing.isLoading)) return <PageLoader />;
  if (!isNew && (listing.isError || !listing.data))
    return <ErrorState title="Annonce introuvable" error={listing.error} onRetry={() => void listing.refetch()} />;
  return <ListingEditor key={listing.data?.id ?? 'new'} listing={isNew ? null : (listing.data ?? null)} shop={shop} />;
}

function ListingEditor({ listing, shop }: { listing: SellerListing | null; shop: SellerShop }) {
  const navigate = useNavigate();
  const { data: categories } = useCategories();
  const options = (categories?.all ?? []).filter((c) => !c.members?.length);
  const [v, setV] = useState<Form>(() => formFrom(listing, shop));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useSaveListing();
  const changeStatus = useSellerAction(({ id, action }: { id: string; action: 'submit' | 'withdraw' }) =>
    sellerBackend.changeListingStatus(id, action),
  );
  const published = listing?.status === 'published' || listing?.status === 'sold';
  const stats = useListingStats(listing?.id, published);
  const set = (patch: Partial<Form>) => setV((x) => ({ ...x, ...patch }));

  const persist = async () => {
    const { fields, errors: next } = validate(v);
    setErrors(next);
    if (!fields) return null;
    try {
      const saved = await save.mutateAsync({ id: listing?.id ?? null, fields });
      if (!listing) navigate(`/vendeur/annonces/${saved.id}`, { replace: true });
      return saved;
    } catch (error) {
      setErrors({ form: getErrorMessage(error), ...apiFieldErrors(error) });
      return null;
    }
  };

  const submitForm = async (e: FormEvent) => {
    e.preventDefault();
    if (await persist()) toast.success(listing ? 'Annonce enregistrée' : 'Brouillon créé');
  };

  const submitForReview = async () => {
    const saved = await persist();
    if (!saved) return;
    changeStatus.mutate(
      { id: saved.id, action: 'submit' },
      {
        onSuccess: () => toast.success('Annonce soumise', { description: 'Elle est vérifiée avant publication.' }),
        onError: (err) => toast.error('Soumission impossible', { description: getErrorMessage(err) }),
      },
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <form onSubmit={(e) => void submitForm(e)} noValidate className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg">{listing ? listing.title : 'Nouvelle annonce'}</h2>
          {listing && <Badge>{listingStatusLabel[listing.status]}</Badge>}
        </div>
        {listing && <ReviewNotice listing={listing} />}
        <TextField
          label="Titre"
          value={v.title}
          onChange={(e) => set({ title: e.target.value })}
          error={errors.title}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Type"
            value={v.kind}
            onChange={(e) => set({ kind: e.target.value === 'service' ? 'service' : 'product' })}
          >
            <option value="product">Produit</option>
            <option value="service">Service</option>
          </SelectField>
          <SelectField
            label="Catégorie"
            value={v.categoryId}
            onChange={(e) => set({ categoryId: e.target.value })}
            error={errors.categoryId}
          >
            <option value="">Choisissez</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName ?? c.name}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Prix (FCFA)"
            inputMode="numeric"
            value={v.price}
            onChange={(e) => set({ price: e.target.value })}
            error={errors.price}
          />
          {v.kind === 'product' && (
            <>
              <SelectField
                label="État"
                value={v.condition}
                onChange={(e) => set({ condition: CONDITIONS.find((c) => c === e.target.value) ?? '' })}
                error={errors.condition}
              >
                <option value="">Choisissez</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {conditionLabel[c]}
                  </option>
                ))}
              </SelectField>
              <TextField
                label="Quantité"
                inputMode="numeric"
                value={v.quantity}
                onChange={(e) => set({ quantity: e.target.value })}
                error={errors.quantity}
              />
            </>
          )}
        </div>
        <TextAreaField
          label="Description"
          rows={6}
          maxLength={5000}
          value={v.description}
          onChange={(e) => set({ description: e.target.value })}
          error={errors.description}
        />
        <ImageGalleryUpload
          label="Photos"
          value={v.photos}
          onChange={(photos) => set({ photos })}
          max={MAX_PHOTOS}
          uploader={listingPhotoUploader}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Ville" value={v.city} onChange={(e) => set({ city: e.target.value })} />
          <TextField label="Quartier" value={v.district} onChange={(e) => set({ district: e.target.value })} />
        </div>
        <fieldset className="space-y-3 rounded-md border border-sage p-4">
          <legend className="px-1 text-sm font-semibold">Négociation dans le tchat</legend>
          <TextField
            label="Prix minimum accepté"
            optional
            inputMode="numeric"
            value={v.minPrice}
            onChange={(e) => set({ minPrice: e.target.value })}
            error={errors.minPrice}
            hint="Jamais montré à l’acheteur. Vide : le prix affiché n’est pas négociable."
          />
          <TextAreaField
            label="Consignes pour répondre aux acheteurs"
            optional
            rows={3}
            maxLength={2000}
            value={v.sellerNotes}
            onChange={(e) => set({ sellerNotes: e.target.value })}
            hint="Horaires, lieu de remise, ce que vous acceptez ou non."
          />
        </fieldset>
        {errors.form && (
          <p className="text-sm font-medium text-danger" role="alert">
            {errors.form}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            variant="outline"
            loading={save.isPending}
            disabled={!!listing && LOCKED.includes(listing.status)}
          >
            {listing ? 'Enregistrer' : 'Enregistrer le brouillon'}
          </Button>
          {(!listing || SUBMITTABLE.includes(listing.status)) && (
            <Button loading={changeStatus.isPending} onClick={() => void submitForReview()}>
              Soumettre à la vérification
            </Button>
          )}
          {listing && WITHDRAWABLE.includes(listing.status) && (
            <Button
              variant="ghost"
              onClick={() =>
                changeStatus.mutate(
                  { id: listing.id, action: 'withdraw' },
                  {
                    onSuccess: () => toast.success('Annonce retirée'),
                    onError: (err) => toast.error('Retrait impossible', { description: getErrorMessage(err) }),
                  },
                )
              }
            >
              Retirer de la vente
            </Button>
          )}
        </div>
        <p className="text-xs text-ink-muted">
          Une annonce publiée dont le prix, les photos ou la description changent repasse la vérification.
        </p>
      </form>

      <aside className="space-y-6">
        <Link to="/vendeur/annonces" className="text-sm font-semibold text-forest hover:underline">
          Toutes mes annonces
        </Link>
        {listing && published && (
          <section className="card space-y-2 p-5 text-sm">
            <h2 className="text-lg">Partager</h2>
            <p className="break-all font-mono text-xs">{shareLink(listing.slug)}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void navigator.clipboard
                  .writeText(shareLink(listing.slug))
                  .then(() => toast.success('Lien copié'))
                  .catch(() => toast.info('Copie impossible'))
              }
            >
              Copier le lien
            </Button>
            <Link to={`/annonces/${listing.slug}`} className="block font-semibold text-forest hover:underline">
              Voir l’annonce publique
            </Link>
          </section>
        )}
        {stats.data && (
          <section className="card p-5 text-sm">
            <h2 className="text-lg">Visites</h2>
            <p className="mt-1 text-ink-soft">{pluralize(stats.data.total, 'visite')} sur les 30 derniers jours.</p>
          </section>
        )}
        {listing?.status === 'published' && <BoostPanel listing={listing} />}
      </aside>
    </div>
  );
}
