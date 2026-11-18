import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Checkbox, SelectField, TextField } from '@/components/ui/TextField';
import type { Category } from '@/features/categories/categories.types';
import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/text';
import { adminApi } from '../admin.api';
import { useAdminMutation } from '../admin.queries';
import type { AdminProduct } from '../admin.types';
import { computeBulkPrices, type BulkRule } from '../product.edit';

/**
 * Modification de prix en masse (4.7) : choix des produits et de la variation, aperçu ligne par ligne,
 * puis validation explicite. Chaque changement est historisé avec le motif.
 */
export function BulkPriceDialog({
  products,
  categories,
  onClose,
}: {
  products: AdminProduct[];
  categories: Category[];
  onClose: () => void;
}) {
  const [scope, setScope] = useState('');
  const [rule, setRule] = useState({ mode: 'percent' as BulkRule['mode'], value: '', round: true });
  const [reason, setReason] = useState('');
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [error, setError] = useState('');

  const roots = categories.filter((c) => !c.parentId && !c.members?.length);
  const selected = products.filter((p) => p.status !== 'archived' && (!scope || p.rootCategoryId === scope));
  const value = Number(rule.value);
  const lines =
    step === 'preview' ? computeBulkPrices(selected, { ...rule, value }).filter((l) => l.after !== l.before) : [];
  const belowCost = lines.filter((l) => l.belowCost);

  const apply = useAdminMutation(
    async () => {
      for (const product of new Set(lines.map((l) => l.product))) {
        const next = Object.fromEntries(lines.filter((l) => l.product === product).map((l) => [l.variant.id, l.after]));
        await adminApi.updateProduct(
          product.id,
          {
            variants: product.variants.map((v) => (next[v.id] !== undefined ? { ...v, price: next[v.id] } : v)),
          },
          reason.trim(),
        );
      }
    },
    () => `Modification de prix en masse : ${lines.length} variante${lines.length > 1 ? 's' : ''} (${reason.trim()})`,
  );

  const preview = () => {
    if (!Number.isFinite(value) || value === 0 || rule.value.trim() === '')
      return setError('Indiquez la variation, par exemple 5 ou -10.');
    if (rule.mode === 'percent' && (value <= -90 || value > 200))
      return setError('Variation en % comprise entre -89 et 200.');
    if (reason.trim().length < 5) return setError('Indiquez le motif : il est conservé avec chaque changement.');
    setError('');
    setStep('preview');
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Modifier les prix en masse"
      description="Rien n’est appliqué avant la validation de l’aperçu."
      className="max-w-3xl"
    >
      {step === 'form' ? (
        <div className="space-y-4">
          <SelectField label="Produits concernés" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="">
              Tout le catalogue ({products.filter((p) => p.status !== 'archived').length} produits)
            </option>
            {roots.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({products.filter((p) => p.status !== 'archived' && p.rootCategoryId === c.id).length})
              </option>
            ))}
          </SelectField>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Type de variation"
              value={rule.mode}
              onChange={(e) => setRule({ ...rule, mode: e.target.value as BulkRule['mode'] })}
            >
              <option value="percent">Pourcentage</option>
              <option value="fixed">Montant en FCFA</option>
            </SelectField>
            <TextField
              label={rule.mode === 'percent' ? 'Variation (%)' : 'Variation (FCFA)'}
              inputMode="numeric"
              placeholder="Ex. 5 ou -10"
              value={rule.value}
              onChange={(e) => setRule({ ...rule, value: e.target.value })}
            />
          </div>
          <Checkbox
            label="Arrondir à la centaine de FCFA"
            checked={rule.round}
            onChange={(e) => setRule({ ...rule, round: e.target.checked })}
          />
          <TextField
            label="Motif"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex. hausse des tarifs fournisseur"
          />
          {error && (
            <p className="text-sm font-medium text-danger" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={preview}>Voir l’aperçu</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            {lines.length} variante{lines.length > 1 ? 's' : ''} sur {selected.length} produit
            {selected.length > 1 ? 's' : ''}.
            {belowCost.length > 0 && (
              <strong className="text-danger">
                {' '}
                Attention : {belowCost.length} prix au niveau du coût d’achat ou en dessous (en rouge).
              </strong>
            )}
          </p>
          <div className="max-h-[45vh] overflow-y-auto rounded-lg border border-sage">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-sage text-left text-xs text-ink-muted">
                  <th className="px-3 py-2 font-semibold">Article</th>
                  <th className="px-3 py-2 text-right font-semibold">Avant</th>
                  <th className="px-3 py-2 text-right font-semibold">Après</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr
                    key={l.variant.id}
                    className={cn('border-b border-sage/70 last:border-0', l.belowCost && 'text-danger')}
                  >
                    <td className="px-3 py-1.5">
                      {l.product.name} · {l.variant.label}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatPrice(l.before)}</td>
                    <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{formatPrice(l.after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setStep('form')}>
              Modifier
            </Button>
            <Button
              disabled={!lines.length}
              loading={apply.isPending}
              onClick={() => apply.mutate(undefined, { onSuccess: onClose })}
            >
              Appliquer {lines.length} changement{lines.length > 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
