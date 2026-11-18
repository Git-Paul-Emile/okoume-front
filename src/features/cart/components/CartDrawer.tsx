import { AnimatePresence } from 'motion/react';
import { ShoppingBag } from 'lucide-react';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { useUiStore } from '@/stores/uiStore';
import { formatPrice } from '@/utils/formatPrice';
import { useCartTotals } from '../useCartTotals';
import { CartLineItem } from './CartLineItem';

export function CartDrawer() {
  const open = useUiStore((s) => s.cartOpen);
  const setOpen = useUiStore((s) => s.setCartOpen);
  const { lines, totals } = useCartTotals();
  const close = () => setOpen(false);

  return (
    <Drawer
      open={open}
      onClose={close}
      title={`Mon panier (${totals.itemCount})`}
      footer={
        lines.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-ink-soft">Sous-total</span>
              <span className="text-lg font-extrabold tabular-nums">{formatPrice(totals.subtotal)}</span>
            </div>
            <p className="text-xs text-ink-muted">
              Frais de livraison calculés selon votre quartier à l’étape suivante.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <ButtonLink to="/panier" variant="outline" onClick={close}>
                Voir le panier
              </ButtonLink>
              <ButtonLink to="/commande" onClick={close}>
                Commander
              </ButtonLink>
            </div>
          </div>
        )
      }
    >
      {lines.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="size-7" />}
          title="Votre panier est vide"
          description="Parcourez le catalogue et ajoutez les produits qui vous plaisent."
          action={
            <Button onClick={close} variant="primary">
              Continuer mes achats
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-sage px-5">
          <AnimatePresence initial={false}>
            {lines.map((l) => (
              <CartLineItem key={l.key} line={l} compact onNavigate={close} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Drawer>
  );
}
