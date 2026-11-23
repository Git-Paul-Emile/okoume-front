import { AnimatePresence } from 'motion/react';
import { Lock, ShoppingBag } from 'lucide-react';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ButtonLink } from '@/components/ui/Button';
import { CartIssues } from '@/features/cart/components/CartIssues';
import { CartLineItem } from '@/features/cart/components/CartLineItem';
import { PromoCodeField } from '@/features/cart/components/PromoCodeField';
import { TotalsList } from '@/features/cart/components/TotalsList';
import { useCartTotals } from '@/features/cart/useCartTotals';
import { useCartValidation } from '@/features/cart/useCartValidation';
import { availableStock } from '@/features/products/products.utils';
import { useCartStore } from '@/stores/cartStore';
import { vatIncluded } from '@/features/cart/cart.utils';

export default function CartPage() {
  const { lines, totals, appliedCode, promoLoading, quoteError } = useCartTotals();
  const { issues, blocking, products } = useCartValidation();
  const clear = useCartStore((s) => s.clear);

  if (!lines.length)
    return (
      <div className="container-page py-10">
        <div className="card">
          <EmptyState
            icon={<ShoppingBag className="size-7" />}
            level="h1"
            title="Votre panier est vide"
            description="Les produits ajoutés sont conservés sur cet appareil. Aucun stock n’est réservé tant que la commande n’est pas confirmée."
            action={<ButtonLink to="/catalogue">Découvrir le catalogue</ButtonLink>}
          />
        </div>
      </div>
    );

  const maxFor = (productId: string, variantId: string) => {
    const v = products?.find((p) => p.id === productId)?.variants.find((x) => x.id === variantId);
    return v ? Math.max(1, availableStock(v)) : 99;
  };

  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: 'Panier' }]} />
      <h1 className="mb-6 text-2xl sm:text-3xl">Mon panier</h1>
      <CartIssues issues={issues} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="card px-5" aria-label="Articles">
          <ul className="divide-y divide-sage">
            <AnimatePresence initial={false}>
              {lines.map((l) => (
                <CartLineItem key={l.key} line={l} max={maxFor(l.productId, l.variantId)} />
              ))}
            </AnimatePresence>
          </ul>
          <div className="flex justify-between border-t border-sage py-4 text-sm">
            <ButtonLink to="/catalogue" variant="ghost" size="sm">
              Continuer mes achats
            </ButtonLink>
            <button type="button" onClick={clear} className="font-medium text-ink-muted hover:text-mure">
              Vider le panier
            </button>
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-36 lg:self-start">
          <div className="card space-y-4 p-5">
            <h2 className="text-lg">Récapitulatif</h2>
            <PromoCodeField error={totals.codeError} loading={promoLoading} applied={!!appliedCode} />
            <TotalsList
              totals={totals}
              deliveryKnown={false}
              promoCode={appliedCode}
              vat={vatIncluded(lines, totals, null)}
            />
            {quoteError && (
              <p className="text-sm font-medium text-danger" role="alert">
                Montant non confirmé par la boutique : {quoteError}
              </p>
            )}
            {blocking ? (
              <p className="rounded-md bg-[#fbf1dc] p-3 text-sm font-medium text-warning">
                Vérifiez les articles signalés en haut de page pour continuer.
              </p>
            ) : (
              <ButtonLink to="/commande" size="lg" className="group w-full">
                Passer la commande
              </ButtonLink>
            )}
            <p className="flex items-center justify-center gap-1.5 text-xs text-ink-muted">
              <Lock className="size-3.5" /> Commande possible sans créer de compte
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
