import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextAreaField } from '@/components/ui/TextField';
import { adminApi } from '@/features/admin/admin.api';
import { useAdminMutation } from '@/features/admin/admin.queries';
import type { AdminProduct, ProductModeration } from '@/features/admin/admin.types';
import { conditionLabel } from '@/features/products/products.utils';
import { formatPrice } from '@/utils/formatPrice';

type Decision = 'approve' | 'request_changes' | 'reject';

const STATE: Record<ProductModeration, string> = {
  in_review: 'Vérification automatique en cours',
  changes_requested: 'Corrections demandées au vendeur',
  pending_moderation: 'À examiner par l’équipe',
  approved: 'Validé',
  rejected: 'Refusé',
};

/**
 * Examen d'un produit de vendeur (cahier des charges 32.3) : l'équipe publie, demande une correction ou refuse.
 * Chaque décision est motivée ; un refus est définitif et retire le produit.
 */
export function SellerProductReviewDialog({ product, onClose }: { product: AdminProduct; onClose: () => void }) {
  const [note, setNote] = useState('');
  const [issues, setIssues] = useState('');
  const [error, setError] = useState<string | null>(null);
  const decide = useAdminMutation(
    (decision: Decision) =>
      adminApi.moderateProduct(
        product.id,
        decision,
        note.trim(),
        issues
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      ),
    (decision) =>
      decision === 'approve'
        ? `${product.name} publié`
        : decision === 'reject'
          ? `${product.name} refusé`
          : 'Corrections demandées au vendeur',
  );

  const submit = (decision: Decision) => {
    if (note.trim().length < 3) {
      setError('Indiquez le motif de votre décision (3 caractères au moins).');
      return;
    }
    setError(null);
    decide.mutate(decision, { onSuccess: onClose });
  };

  const prices = product.variants.map((v) => v.price);
  const final = product.moderation === 'rejected';

  return (
    <Modal open onClose={onClose} title={product.name} description={`Boutique ${product.seller?.name ?? ''}`}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          {product.images.slice(0, 4).map((src) => (
            <img key={src} src={src} alt="" className="size-20 rounded-md border border-sage object-cover" />
          ))}
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-ink-muted">Vérification</dt>
          <dd className="font-semibold">{product.moderation ? STATE[product.moderation] : 'Brouillon'}</dd>
          <dt className="text-ink-muted">État du produit</dt>
          <dd>{product.condition ? conditionLabel(product.condition) : 'Non renseigné'}</dd>
          <dt className="text-ink-muted">Prix</dt>
          <dd>
            {formatPrice(Math.min(...prices))}
            {prices.length > 1 ? ` à ${formatPrice(Math.max(...prices))}` : ''}
          </dd>
        </dl>
        <p className="text-sm text-ink-soft">{product.shortDescription}</p>
        {product.description.map((p, i) => (
          <p key={i} className="text-sm text-ink-soft">
            {p}
          </p>
        ))}
        {!!product.moderationIssues?.length && (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {product.moderationIssues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        )}
        {product.seller && (
          <Link to={`/boutiques/${product.seller.slug}`} className="text-sm font-semibold text-forest hover:underline">
            Voir la boutique
          </Link>
        )}
        {final ? (
          <p className="text-sm text-ink-soft">Ce produit a été refusé : la décision est définitive.</p>
        ) : (
          <>
            <TextAreaField
              label="Motif de la décision"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              error={error ?? undefined}
            />
            <TextAreaField
              label="Points à corriger (un par ligne, facultatif)"
              rows={3}
              value={issues}
              onChange={(e) => setIssues(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button loading={decide.isPending} onClick={() => submit('approve')}>
                Publier
              </Button>
              <Button variant="outline" loading={decide.isPending} onClick={() => submit('request_changes')}>
                Demander une correction
              </Button>
              <Button variant="ghost" loading={decide.isPending} onClick={() => submit('reject')}>
                Refuser
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
