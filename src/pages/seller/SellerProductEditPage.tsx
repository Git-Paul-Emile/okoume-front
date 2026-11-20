import { Plus, Trash2 } from 'lucide-react';
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
import { useSellerAction, useSellerProduct } from '@/features/seller/seller.queries';
import {
  CONDITIONS,
  productConditionLabel,
  productPhotoUploader,
  sellerProductsBackend,
  sellerProductState,
  type SellerProduct,
  type SellerProductCondition,
  type SellerProductFields,
} from '@/features/seller/sellerProducts.backend';
import { toast } from '@/stores/toastStore';
import { formatPrice } from '@/utils/formatPrice';

const MAX_PHOTOS = 8;

interface Form {
  name: string;
  categoryId: string;
  brand: string;
  condition: SellerProductCondition | '';
  shortDescription: string;
  description: string;
  images: string[];
}

interface VariantRow {
  label: string;
  price: string;
  stock: string;
}

const formFrom = (p: SellerProduct | null): Form => ({
  name: p?.name ?? '',
  categoryId: p?.categoryId ?? '',
  brand: p?.brand ?? '',
  condition: p?.condition ?? '',
  shortDescription: p?.shortDescription ?? '',
  description: p?.description.join('\n\n') ?? '',
  images: p?.images ?? [],
});

const whole = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value.trim()) : null);

/** Contrôles du formulaire, avec des messages clairs ; l'API refait les mêmes contrôles. */
function validate(v: Form): { fields: SellerProductFields | null; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (v.name.trim().length < 3) errors.name = 'Donnez un nom d’au moins 3 caractères.';
  if (!v.categoryId) errors.categoryId = 'Choisissez une catégorie.';
  if (!v.condition) errors.condition = 'Choisissez l’état du produit.';
  if (v.shortDescription.trim().length < 10) errors.shortDescription = 'Décrivez le produit en au moins 10 caractères.';
  if (!v.images.length) errors.images = 'Ajoutez au moins une photo.';
  if (Object.keys(errors).length || !v.condition) return { fields: null, errors };
  return {
    errors,
    fields: {
      name: v.name.trim(),
      categoryId: v.categoryId,
      brand: v.brand.trim() || null,
      condition: v.condition,
      shortDescription: v.shortDescription.trim(),
      description: v.description
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean),
      images: v.images,
    },
  };
}

/** Rappel de la vérification : points à corriger, ou décision de l'équipe. */
function ModerationNotice({ product }: { product: SellerProduct }) {
  if (!product.moderation || product.moderation === 'approved') return null;
  const title = {
    in_review: 'Vérification en cours : le produit sera publié dès qu’elle sera favorable.',
    changes_requested: 'Corrections demandées avant publication',
    pending_moderation: 'Produit transmis à l’équipe Okoumé pour examen',
    rejected: 'Produit refusé par l’équipe Okoumé',
  }[product.moderation];
  return (
    <div className="rounded-md bg-[#fbf1dc] p-4 text-sm" role="status">
      <p className="font-semibold text-warning">{title}</p>
      {product.moderationIssues.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {product.moderationIssues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      )}
      {product.moderationNote && <p className="mt-2 text-ink-soft">{product.moderationNote}</p>}
    </div>
  );
}

/** Création ou modification d'un produit de la boutique (32.3) : vérifié avant chaque publication. */
export default function SellerProductEditPage() {
  const { id } = useParams();
  const isNew = !id || id === 'nouveau';
  const product = useSellerProduct(isNew ? undefined : id);
  if (!isNew && product.isLoading) return <PageLoader />;
  if (!isNew && (product.isError || !product.data))
    return <ErrorState title="Produit introuvable" error={product.error} onRetry={() => void product.refetch()} />;
  return <ProductEditor key={product.data?.id ?? 'new'} product={isNew ? null : (product.data ?? null)} />;
}

function ProductEditor({ product }: { product: SellerProduct | null }) {
  const navigate = useNavigate();
  const { data: categories } = useCategories();
  const options = (categories?.all ?? []).filter((c) => !c.members?.length);
  const [v, setV] = useState<Form>(() => formFrom(product));
  const [optionName, setOptionName] = useState('');
  const [rows, setRows] = useState<VariantRow[]>([{ label: 'Standard', price: '', stock: '1' }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (patch: Partial<Form>) => setV((x) => ({ ...x, ...patch }));
  const save = useSellerAction(async (fields: SellerProductFields) => {
    if (product) return sellerProductsBackend.update(product.id, fields);
    const variants = rows.map((r) => ({
      label: r.label.trim(),
      price: whole(r.price) ?? 0,
      stock: whole(r.stock) ?? 0,
    }));
    return sellerProductsBackend.create(fields, rows.length > 1 ? optionName.trim() || null : null, variants);
  });
  const action = useSellerAction(({ id, kind }: { id: string; kind: 'submit' | 'withdraw' }) =>
    kind === 'submit' ? sellerProductsBackend.submit(id) : sellerProductsBackend.withdraw(id),
  );

  const variantErrors = () => {
    const next: Record<string, string> = {};
    if (rows.length > 1 && !optionName.trim()) next.optionName = 'Indiquez ce qui distingue les variantes (Taille…).';
    rows.forEach((r, i) => {
      if (!r.label.trim()) next[`variant-${i}-label`] = 'Donnez un nom à la variante.';
      if (!whole(r.price)) next[`variant-${i}-price`] = 'Prix entier en FCFA.';
      if (whole(r.stock) === null) next[`variant-${i}-stock`] = 'Quantité entière.';
    });
    return next;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const { fields, errors: next } = validate(v);
    const all = { ...next, ...(product ? {} : variantErrors()) };
    setErrors(all);
    if (!fields || Object.keys(all).length) return;
    try {
      const saved = await save.mutateAsync(fields);
      toast.success(product ? 'Produit modifié' : 'Produit enregistré', {
        description: 'Il est vérifié avant d’être publié sur Okoumé.',
      });
      if (!product) navigate(`/vendeur/produits/${saved.id}`, { replace: true });
    } catch (error) {
      setErrors({ form: getErrorMessage(error), ...apiFieldErrors(error) });
    }
  };

  const run = (kind: 'submit' | 'withdraw') =>
    product &&
    action.mutate(
      { id: product.id, kind },
      {
        onSuccess: () =>
          toast.success(kind === 'submit' ? 'Produit soumis à la vérification' : 'Produit retiré de la vente'),
        onError: (err) => toast.error('Action impossible', { description: getErrorMessage(err) }),
      },
    );

  const state = product ? sellerProductState(product) : null;
  const locked = product?.moderation === 'rejected';
  const canSubmit = product && !locked && product.status !== 'published' && product.moderation !== 'in_review';

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <form onSubmit={(e) => void onSubmit(e)} noValidate className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg">{product ? product.name : 'Nouveau produit'}</h2>
          {state && <Badge tone={state.tone}>{state.label}</Badge>}
        </div>
        {product && <ModerationNotice product={product} />}
        <TextField
          label="Nom du produit"
          value={v.name}
          onChange={(e) => set({ name: e.target.value })}
          error={errors.name}
        />
        <div className="grid gap-4 sm:grid-cols-3">
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
          <SelectField
            label="État"
            value={v.condition}
            onChange={(e) => set({ condition: CONDITIONS.find((c) => c === e.target.value) ?? '' })}
            error={errors.condition}
          >
            <option value="">Choisissez</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {productConditionLabel[c]}
              </option>
            ))}
          </SelectField>
          <TextField label="Marque (facultatif)" value={v.brand} onChange={(e) => set({ brand: e.target.value })} />
        </div>
        <TextField
          label="Résumé"
          value={v.shortDescription}
          onChange={(e) => set({ shortDescription: e.target.value })}
          error={errors.shortDescription}
          hint="Une phrase affichée sous le nom du produit."
        />
        <TextAreaField
          label="Description (facultatif)"
          rows={6}
          maxLength={5000}
          value={v.description}
          onChange={(e) => set({ description: e.target.value })}
          hint="Laissez une ligne vide entre deux paragraphes."
        />
        <ImageGalleryUpload
          label="Photos"
          value={v.images}
          onChange={(images) => set({ images })}
          max={MAX_PHOTOS}
          uploader={productPhotoUploader}
        />
        {errors.images && <p className="text-sm text-danger">{errors.images}</p>}

        {!product && (
          <fieldset className="space-y-3">
            <legend className="font-semibold">Prix et stock</legend>
            {rows.length > 1 && (
              <TextField
                label="Ce qui distingue les variantes"
                placeholder="Taille, Couleur…"
                value={optionName}
                onChange={(e) => setOptionName(e.target.value)}
                error={errors.optionName}
              />
            )}
            {rows.map((r, i) => (
              <div key={i} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <TextField
                  label="Variante"
                  value={r.label}
                  onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))}
                  error={errors[`variant-${i}-label`]}
                />
                <TextField
                  label="Prix (FCFA)"
                  inputMode="numeric"
                  value={r.price}
                  onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, price: e.target.value } : y)))}
                  error={errors[`variant-${i}-price`]}
                />
                <TextField
                  label="Quantité en stock"
                  inputMode="numeric"
                  value={r.stock}
                  onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, stock: e.target.value } : y)))}
                  error={errors[`variant-${i}-stock`]}
                />
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Retirer la variante ${i + 1}`}
                  disabled={rows.length === 1}
                  onClick={() => setRows((x) => x.filter((_, j) => j !== i))}
                  icon={<Trash2 className="size-4" />}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<Plus className="size-4" />}
              onClick={() => setRows((x) => [...x, { label: '', price: '', stock: '1' }])}
            >
              Ajouter une variante
            </Button>
          </fieldset>
        )}

        {errors.form && (
          <p className="rounded-md bg-mure-50 p-3 text-sm text-mure-dark" role="alert">
            {errors.form}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={save.isPending} disabled={locked}>
            {product ? 'Enregistrer les modifications' : 'Enregistrer et soumettre'}
          </Button>
          {canSubmit && (
            <Button type="button" variant="outline" loading={action.isPending} onClick={() => run('submit')}>
              Soumettre à la vérification
            </Button>
          )}
          {product && product.status !== 'archived' && (
            <Button type="button" variant="ghost" loading={action.isPending} onClick={() => run('withdraw')}>
              Retirer de la vente
            </Button>
          )}
        </div>
        {product?.status === 'published' && (
          <p className="text-sm text-ink-soft">
            En vente sur Okoumé :{' '}
            <Link to={`/produit/${product.slug}`} className="font-semibold text-forest hover:underline">
              voir la fiche publique
            </Link>
            . Toute modification repasse la vérification avant d’être publiée.
          </p>
        )}
      </form>
      {product && <VariantsPanel product={product} />}
    </div>
  );
}

/** Prix et stock par variante ; un changement de prix repasse la vérification. */
function VariantsPanel({ product }: { product: SellerProduct }) {
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [added, setAdded] = useState<VariantRow>({ label: '', price: '', stock: '1' });
  const act = useSellerAction((fn: () => Promise<SellerProduct>) => fn());
  const locked = product.moderation === 'rejected';

  const run = (fn: () => Promise<SellerProduct>, done: string) =>
    act.mutate(fn, {
      onSuccess: () => toast.success(done),
      onError: (err) => toast.error('Action impossible', { description: getErrorMessage(err) }),
    });

  return (
    <section className="card space-y-4 p-5">
      <h2 className="text-lg">Prix et stock</h2>
      <ul className="space-y-4">
        {product.variants.map((variant) => {
          const count = counts[variant.id] ?? String(variant.stock);
          const price = prices[variant.id] ?? String(variant.price);
          return (
            <li key={variant.id} className="space-y-2 border-b border-sage pb-4 last:border-0">
              <p className="font-semibold">
                {variant.label}{' '}
                <span className="text-sm font-normal text-ink-soft">
                  {formatPrice(variant.price)} · {variant.reserved} réservé{variant.reserved > 1 ? 's' : ''}
                </span>
              </p>
              <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                <TextField
                  label="Prix (FCFA)"
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPrices((x) => ({ ...x, [variant.id]: e.target.value }))}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={locked || !whole(price) || whole(price) === variant.price}
                  onClick={() =>
                    run(
                      () => sellerProductsBackend.updateVariant(product.id, variant.id, { price: whole(price)! }),
                      'Prix modifié : le produit repasse la vérification',
                    )
                  }
                >
                  Modifier
                </Button>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                <TextField
                  label="Stock compté"
                  inputMode="numeric"
                  value={count}
                  onChange={(e) => setCounts((x) => ({ ...x, [variant.id]: e.target.value }))}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={locked || whole(count) === null || whole(count) === variant.stock}
                  onClick={() =>
                    run(
                      () =>
                        sellerProductsBackend.setStock(
                          product.id,
                          variant.id,
                          whole(count)!,
                          'Stock compté par le vendeur',
                        ),
                      'Stock mis à jour',
                    )
                  }
                >
                  Mettre à jour
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {!locked && (
        <div className="space-y-2">
          <p className="font-semibold">Ajouter une variante</p>
          <TextField
            label="Variante"
            value={added.label}
            onChange={(e) => setAdded((x) => ({ ...x, label: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <TextField
              label="Prix (FCFA)"
              inputMode="numeric"
              value={added.price}
              onChange={(e) => setAdded((x) => ({ ...x, price: e.target.value }))}
            />
            <TextField
              label="Stock"
              inputMode="numeric"
              value={added.stock}
              onChange={(e) => setAdded((x) => ({ ...x, stock: e.target.value }))}
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!added.label.trim() || !whole(added.price) || whole(added.stock) === null}
            onClick={() => {
              run(
                () =>
                  sellerProductsBackend.addVariant(product.id, {
                    label: added.label.trim(),
                    price: whole(added.price)!,
                    stock: whole(added.stock)!,
                  }),
                'Variante ajoutée',
              );
              setAdded({ label: '', price: '', stock: '1' });
            }}
          >
            Ajouter
          </Button>
        </div>
      )}
    </section>
  );
}
