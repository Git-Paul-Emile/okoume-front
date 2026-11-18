import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCartStore } from '@/stores/cartStore';
import { formatPrice } from '@/utils/formatPrice';
import type { LineIssue } from '../useCartValidation';

/** Prix modifiés ou ruptures : le client voit l'ancien et le nouveau prix et confirme avant de commander. */
export function CartIssues({ issues }: { issues: LineIssue[] }) {
  const acceptPrice = useCartStore((s) => s.acceptPrice);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  if (!issues.length) return null;

  return (
    <div className="mb-5 rounded-lg border border-[#e8c98a] bg-[#fbf1dc] p-4" role="alert">
      <p className="flex items-center gap-2 font-bold text-warning">
        <AlertTriangle className="size-5" /> Votre panier doit être vérifié avant de commander
      </p>
      <ul className="mt-3 space-y-3">
        {issues.map((i) => (
          <li
            key={`${i.line.key}-${i.kind}`}
            className="flex flex-col gap-2 rounded-md bg-white p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <span>
              <strong>{i.line.name}</strong> ({i.line.variantLabel}) :{' '}
              {i.kind === 'price_changed' && (
                <>
                  le prix est passé de <s>{formatPrice(i.line.unitPrice)}</s> à{' '}
                  <strong>{formatPrice(i.newUnitPrice!)}</strong>.
                </>
              )}
              {i.kind === 'unavailable' && 'ce produit n’est plus disponible.'}
              {i.kind === 'insufficient_stock' && `il ne reste que ${i.available} unité(s).`}
            </span>
            <span className="flex shrink-0 gap-2">
              {i.kind === 'price_changed' && (
                <Button
                  size="sm"
                  onClick={() => acceptPrice(i.line.key, i.newUnitPrice!, i.newOriginalPrice!, !!i.hasPromotion)}
                >
                  Accepter le nouveau prix
                </Button>
              )}
              {i.kind === 'insufficient_stock' && (
                <Button size="sm" onClick={() => setQuantity(i.line.key, i.available!)}>
                  Passer à {i.available}
                </Button>
              )}
              <Button size="sm" variant="danger" onClick={() => remove(i.line.key)}>
                Retirer
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
