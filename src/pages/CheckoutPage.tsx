import { AnimatePresence, motion } from 'motion/react';
import { ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { ButtonLink } from '@/components/ui/Button';
import { TotalsList } from '@/features/cart/components/TotalsList';
import { useCartTotals } from '@/features/cart/useCartTotals';
import { useCartValidation } from '@/features/cart/useCartValidation';
import { CheckoutSteps } from '@/features/checkout/components/CheckoutSteps';
import { DeliveryStep } from '@/features/checkout/components/DeliveryStep';
import { PaymentStep } from '@/features/checkout/components/PaymentStep';
import { ReviewStep } from '@/features/checkout/components/ReviewStep';
import { usePlaceOrder } from '@/features/checkout/checkout.queries';
import type { DeliveryInput } from '@/features/checkout/checkout.schemas';
import { useIdempotencyKey } from '@/features/checkout/useIdempotencyKey';
import { useDeliveryZones } from '@/features/delivery/delivery.queries';
import type { PaymentMethod } from '@/features/orders/orders.types';
import { useCartStore } from '@/stores/cartStore';
import { formatPrice } from '@/utils/formatPrice';
import { vatIncluded } from '@/features/cart/cart.utils';

export default function CheckoutPage() {
  const [step, setStepState] = useState(0);
  const setStep = (next: number) => {
    setStepState(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [draft, setDraft] = useState<Partial<DeliveryInput>>({});
  const [delivery, setDelivery] = useState<DeliveryInput | null>(null);
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const { data: zones, isLoading } = useDeliveryZones();
  const zone = zones?.find((z) => z.id === (delivery?.zoneId ?? draft.zoneId)) ?? null;
  const { lines, totals, appliedCode, quoteError, settings, user } = useCartTotals(zone?.fee ?? null, zone?.id ?? null);
  const { blocking } = useCartValidation();
  const placeOrder = usePlaceOrder();
  const { key, renew } = useIdempotencyKey();
  const clear = useCartStore((s) => s.clear);
  const navigate = useNavigate();

  // Préremplissage depuis le compte, une seule fois
  if (user && !draft.email && !draft.recipient) {
    const a = user.addresses.find((x) => x.isDefault) ?? user.addresses[0];
    setDraft({
      recipient: a?.recipient ?? `${user.firstName} ${user.lastName}`,
      phone: a?.phone ?? user.phone,
      email: user.email,
      zoneId: a?.zoneId ?? '',
      landmark: a?.landmark ?? '',
      instructions: a?.instructions ?? '',
    });
  }

  if (placeOrder.isSuccess) return null;
  if (!lines.length)
    return (
      <div className="container-page py-10">
        <div className="card">
          <EmptyState
            icon={<ShoppingBag className="size-7" />}
            level="h1"
            title="Votre panier est vide"
            action={<ButtonLink to="/catalogue">Découvrir le catalogue</ButtonLink>}
          />
        </div>
      </div>
    );
  if (blocking) return <Navigate to="/panier" replace />;
  if (isLoading) return <PageLoader />;

  const confirm = () => {
    if (!delivery || !zone || !payment) return;
    placeOrder.mutate(
      { idempotencyKey: key, lines, totals, delivery, paymentMethod: payment, appliedCode, user },
      {
        onSuccess: (order) => {
          clear();
          renew();
          navigate(`/commande/confirmation/${order.number}`, { replace: true, state: { order } });
        },
      },
    );
  };

  const panels = [
    <DeliveryStep
      key="d"
      value={draft}
      zones={zones ?? []}
      user={user}
      onChange={setDraft}
      onNext={(d) => {
        setDelivery(d);
        setStep(1);
      }}
    />,
    <PaymentStep
      key="p"
      value={payment}
      onBack={() => setStep(0)}
      onNext={(m) => {
        setPayment(m);
        setStep(2);
      }}
    />,
    delivery && zone && payment ? (
      <ReviewStep
        key="r"
        delivery={delivery}
        zone={zone}
        payment={payment}
        submitting={placeOrder.isPending}
        error={placeOrder.error}
        onEdit={setStep}
        onConfirm={confirm}
      />
    ) : null,
  ];

  return (
    <div className="container-page py-6 lg:py-8">
      <h1 className="mb-6 text-2xl sm:text-3xl">Finaliser ma commande</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="card p-5 sm:p-8">
          <CheckoutSteps current={step} onGoTo={setStep} />
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
            >
              {panels[step]}
            </motion.div>
          </AnimatePresence>
          {!user && step === 0 && (
            <p className="mt-6 border-t border-sage pt-4 text-sm text-ink-soft">
              Vous avez un compte ?{' '}
              <Link to="/connexion?retour=/commande" className="font-semibold text-forest hover:underline">
                Connectez-vous
              </Link>{' '}
              pour utiliser vos adresses et vos points. Sinon, continuez sans compte.
            </p>
          )}
        </section>

        <aside className="lg:sticky lg:top-36 lg:self-start">
          <div className="card p-5">
            <h2 className="mb-3 text-lg">Votre commande</h2>
            <ul className="mb-4 max-h-64 divide-y divide-sage overflow-y-auto">
              {lines.map((l) => (
                <li key={l.key} className="flex items-center gap-3 py-2.5">
                  <span className="relative shrink-0">
                    <img
                      src={l.image}
                      alt=""
                      className="size-12 rounded-md border border-sage bg-white object-contain p-1"
                    />
                    <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-ink text-[10px] font-bold text-white">
                      {l.quantity}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{l.name}</span>
                    <span className="text-xs text-ink-muted">{l.variantLabel}</span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{formatPrice(l.unitPrice * l.quantity)}</span>
                </li>
              ))}
            </ul>
            <TotalsList
              totals={totals}
              deliveryKnown={!!zone}
              promoCode={appliedCode}
              vat={vatIncluded(lines, totals, zone ? (settings?.deliveryVatRate ?? 18) : null)}
            />
            {quoteError && (
              <p className="mt-3 text-sm font-medium text-danger" role="alert">
                Montant non confirmé par la boutique : {quoteError}
              </p>
            )}
            <Link to="/panier" className="mt-4 block text-center text-sm font-semibold text-forest hover:underline">
              Modifier le panier, le code promo ou les points
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
