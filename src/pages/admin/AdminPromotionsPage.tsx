import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Checkbox, SelectField, TextField } from '@/components/ui/TextField';
import type { PromoCode } from '@/features/promotions/promotions.types';
import { adminApi } from '@/features/admin/admin.api';
import {
  useAdminCategories,
  useAdminMutation,
  useAdminProducts,
  useAdminPromoCodes,
} from '@/features/admin/admin.queries';
import type { TierId } from '@/features/settings/settings.types';
import { matches } from '@/features/admin/admin.utils';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { StateBadge } from '@/features/admin/components/StatusBadges';
import { Switch } from '@/components/ui/Switch';
import { PageIntro, StatRow } from '@/features/admin/components/Toolbar';
import { isPromotionActive } from '@/features/products/products.utils';
import { formatDate } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';
import { uid } from '@/utils/ids';

const benefit = (c: PromoCode) =>
  c.freeDelivery ? 'Livraison offerte' : c.type === 'percent' ? `${c.value} %` : formatPrice(c.value);

export default function AdminPromotionsPage() {
  const { data: codes, isLoading } = useAdminPromoCodes();
  const { data: products = [] } = useAdminProducts();
  const [editing, setEditing] = useState<PromoCode | 'new' | null>(null);
  const toggle = useAdminMutation(
    (c: PromoCode) => adminApi.updatePromoCode(c.id, { active: !c.active }),
    (c) => (c.active ? `${c.code} désactivé` : `${c.code} activé`),
  );

  if (isLoading || !codes) return <PageLoader />;

  const now = new Date();
  const expired = (c: PromoCode) => new Date(c.endsAt) < now;

  const columns: Column<PromoCode>[] = [
    {
      key: 'code',
      header: 'Code',
      cell: (c) => (
        <>
          <code className="block font-bold text-ink">{c.code}</code>
          <span className="block text-xs text-ink-muted">{c.label}</span>
        </>
      ),
    },
    { key: 'benefit', header: 'Avantage', cell: benefit },
    {
      key: 'conditions',
      header: 'Conditions',
      cell: (c) => (
        <span className="text-ink-soft">
          {[
            c.minAmount ? `Dès ${formatPrice(c.minAmount)}` : null,
            c.newCustomersOnly ? '1re commande' : null,
            c.tiers.length ? `Niveaux ${c.tiers.join(', ')}` : null,
            c.categoryIds.length ? `${c.categoryIds.length} catégorie(s)` : null,
            c.productIds.length ? `${c.productIds.length} produit(s)` : null,
            c.perCustomer ? `${c.perCustomer} par client` : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'Aucune'}
        </span>
      ),
    },
    {
      key: 'uses',
      header: 'Utilisations',
      align: 'right',
      cell: (c) => (c.maxUses === null ? `${c.uses} (sans limite)` : `${c.uses} / ${c.maxUses}`),
    },
    {
      key: 'ends',
      header: 'Fin',
      cell: (c) => (expired(c) ? <StateBadge tone="neutral">Expiré</StateBadge> : formatDate(c.endsAt)),
    },
    {
      key: 'active',
      header: 'Actif',
      align: 'center',
      cell: (c) => <Switch checked={c.active} onChange={() => toggle.mutate(c)} label={`Activer ${c.code}`} />,
    },
  ];

  return (
    <>
      <PageIntro
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>
            Nouveau code
          </Button>
        }
      >
        Les remises s’appliquent dans cet ordre : promotion du produit, code promo, puis points de fidélité, dans la
        limite du plafond de remise défini dans les paramètres.
      </PageIntro>
      <StatRow
        items={[
          { label: 'Codes actifs', value: codes.filter((c) => c.active && !expired(c)).length },
          { label: 'Utilisations', value: codes.reduce((s, c) => s + c.uses, 0) },
          { label: 'Produits en promotion', value: products.filter((p) => isPromotionActive(p.promotion)).length },
          { label: 'Codes expirés', value: codes.filter(expired).length },
        ]}
      />
      <AdminTable caption="Codes promo" columns={columns} rows={codes} rowKey={(c) => c.id} onRowClick={setEditing} />
      <p className="mt-3 text-sm text-ink-muted">
        Les promotions par produit se règlent depuis l’écran Produits (remise en %).
      </p>
      {editing && (
        <CodeDialog code={editing === 'new' ? null : editing} codes={codes} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

function CodeDialog({ code, codes, onClose }: { code: PromoCode | null; codes: PromoCode[]; onClose: () => void }) {
  const [v, setV] = useState(() => ({
    code: code?.code ?? '',
    label: code?.label ?? '',
    type: code?.type ?? 'percent',
    value: String(code?.value ?? ''),
    minAmount: String(code?.minAmount ?? 0),
    maxUses: code ? (code.maxUses === null ? '' : String(code.maxUses)) : '100',
    endsAt: (code?.endsAt ?? new Date(Date.now() + 30 * 86_400_000).toISOString()).slice(0, 10),
    newCustomersOnly: code?.newCustomersOnly ?? false,
    freeDelivery: code?.freeDelivery ?? false,
    perCustomer: String(code?.perCustomer ?? 1),
    productIds: code?.productIds ?? [],
    categoryIds: code?.categoryIds ?? [],
    tiers: code?.tiers ?? [],
  }));
  const { data: categories = [] } = useAdminCategories();
  const { data: products = [] } = useAdminProducts();
  const [productQuery, setProductQuery] = useState('');
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  const roots = categories.filter((c) => !c.parentId && !c.members?.length);
  const found = productQuery.trim()
    ? products.filter((p) => p.status !== 'archived' && matches(productQuery, p.name, p.sku)).slice(0, 8)
    : [];
  const [error, setError] = useState('');
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }));
  const save = useAdminMutation(
    (c: PromoCode) => (code ? adminApi.updatePromoCode(c.id, c) : adminApi.createPromoCode(c)),
    (c) => `Code ${c.code} enregistré`,
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const codeValue = v.code.trim().toUpperCase();
    const value = Number(v.value);
    if (!/^[A-Z0-9]{4,20}$/.test(codeValue)) return setError('Le code : 4 à 20 lettres ou chiffres, sans espace.');
    if (codes.some((c) => c.code === codeValue && c.id !== code?.id)) return setError('Ce code existe déjà.');
    if (!v.freeDelivery && (!Number.isInteger(value) || value <= 0 || (v.type === 'percent' && value > 90)))
      return setError('La valeur doit être un entier positif (90 % au maximum).');
    const perCustomer = Number(v.perCustomer);
    if (!Number.isInteger(perCustomer) || perCustomer < 0)
      return setError('Limite par client : un entier, 0 pour illimité.');
    save.mutate(
      {
        id: code?.id ?? uid(),
        uses: 0,
        active: true,
        startsAt: new Date().toISOString(),
        ...code,
        code: codeValue,
        label: v.label.trim() || codeValue,
        type: v.type as PromoCode['type'],
        value: v.freeDelivery ? 0 : value,
        minAmount: Number(v.minAmount) || 0,
        maxUses: v.maxUses.trim() === '' ? null : Number(v.maxUses) || 1,
        endsAt: new Date(`${v.endsAt}T23:59:00`).toISOString(),
        newCustomersOnly: v.newCustomersOnly,
        freeDelivery: v.freeDelivery,
        perCustomer,
        productIds: v.productIds,
        categoryIds: v.categoryIds,
        tiers: v.tiers,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal open onClose={onClose} title={code ? `Modifier ${code.code}` : 'Nouveau code promo'} className="max-w-xl">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Code" value={v.code} onChange={(e) => set({ code: e.target.value })} />
          <TextField label="Description" value={v.label} onChange={(e) => set({ label: e.target.value })} />
        </div>
        <Checkbox
          label="Livraison offerte"
          checked={v.freeDelivery}
          onChange={(e) => set({ freeDelivery: e.target.checked })}
        />
        {!v.freeDelivery && (
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Type de remise"
              value={v.type}
              onChange={(e) => set({ type: e.target.value as PromoCode['type'] })}
            >
              <option value="percent">Pourcentage</option>
              <option value="fixed">Montant fixe (FCFA)</option>
            </SelectField>
            <TextField
              label="Valeur"
              inputMode="numeric"
              value={v.value}
              onChange={(e) => set({ value: e.target.value })}
            />
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Panier minimum"
            inputMode="numeric"
            value={v.minAmount}
            onChange={(e) => set({ minAmount: e.target.value })}
          />
          <TextField
            label="Utilisations max."
            inputMode="numeric"
            hint="Vide : sans limite."
            value={v.maxUses}
            onChange={(e) => set({ maxUses: e.target.value })}
          />
          <TextField label="Fin" type="date" value={v.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Utilisations par client"
            inputMode="numeric"
            value={v.perCustomer}
            onChange={(e) => set({ perCustomer: e.target.value })}
            hint="0 pour illimité."
          />
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Niveaux de fidélité</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {(['bronze', 'argent', 'or'] as TierId[]).map((t) => (
                <Checkbox
                  key={t}
                  label={{ bronze: 'Bronze', argent: 'Argent', or: 'Or' }[t]}
                  checked={v.tiers.includes(t)}
                  onChange={() => set({ tiers: toggle(v.tiers, t) })}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-ink-muted">Aucun coché : tous les clients.</p>
          </fieldset>
        </div>
        <Checkbox
          label="Réservé à la première commande"
          checked={v.newCustomersOnly}
          onChange={(e) => set({ newCustomersOnly: e.target.checked })}
        />
        {!v.freeDelivery && (
          <fieldset className="space-y-3 rounded-lg border border-sage p-3">
            <legend className="px-1 text-sm font-medium">Articles éligibles</legend>
            <p className="text-xs text-ink-muted">
              Sans sélection, le code s’applique à tout le catalogue (hors articles déjà en promotion).
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {roots.map((c) => (
                <Checkbox
                  key={c.id}
                  label={c.name}
                  checked={v.categoryIds.includes(c.id)}
                  onChange={() => set({ categoryIds: toggle(v.categoryIds, c.id) })}
                />
              ))}
            </div>
            <TextField
              label="Ajouter un produit"
              type="search"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Nom ou référence"
            />
            {found.length > 0 && (
              <ul className="max-h-40 overflow-y-auto rounded-md border border-sage text-sm">
                {found.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-ivory"
                      onClick={() => set({ productIds: toggle(v.productIds, p.id) })}
                    >
                      {p.name}
                      <span className="text-xs font-semibold text-forest">
                        {v.productIds.includes(p.id) ? 'Retirer' : 'Ajouter'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {v.productIds.length > 0 && (
              <ul className="flex flex-wrap gap-2 text-sm" aria-label="Produits éligibles">
                {v.productIds.map((id) => (
                  <li key={id} className="flex items-center gap-1 rounded-md bg-ivory px-2 py-1">
                    {products.find((p) => p.id === id)?.name ?? id}
                    <button
                      type="button"
                      className="ml-1 font-semibold text-danger"
                      aria-label={`Retirer ${products.find((p) => p.id === id)?.name ?? 'ce produit'}`}
                      onClick={() => set({ productIds: v.productIds.filter((x) => x !== id) })}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
        )}
        {error && (
          <p className="text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={save.isPending}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
