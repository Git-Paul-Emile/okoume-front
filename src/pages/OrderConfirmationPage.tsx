import { motion } from 'motion/react';
import { Printer } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useParams } from 'react-router';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PaymentInstructions } from '@/features/checkout/components/PaymentInstructions';
import { OrderItems, OrderTotalsTable } from '@/features/orders/components/OrderSummary';
import { PaymentDeclaration } from '@/features/orders/components/PaymentDeclaration';
import type { Order } from '@/features/orders/orders.types';
import { useSettings } from '@/features/settings/settings.queries';
import { formatDateTime } from '@/utils/formatDate';

function AnimatedCheck() {
  return (
    <motion.svg viewBox="0 0 52 52" className="size-20" initial="hidden" animate="show" aria-hidden="true">
      <motion.circle
        cx="26"
        cy="26"
        r="24"
        fill="none"
        stroke="#2F6C55"
        strokeWidth="3"
        variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: 0.6 } } }}
      />
      <motion.path
        d="M15 27l7 7 15-16"
        fill="none"
        stroke="#2F6C55"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: 0.4, delay: 0.55 } } }}
      />
    </motion.svg>
  );
}

export default function OrderConfirmationPage() {
  const { number } = useParams();
  const placed = (useLocation().state as { order?: Order } | null)?.order;
  // Mise à jour locale après la déclaration du paiement : la réponse du suivi ne contient pas les coordonnées
  const [declared, setDeclared] = useState<Pick<Order, 'paymentStatus' | 'paymentDeclaration'> | null>(null);
  const order = placed && declared ? { ...placed, ...declared } : placed;
  const { data: settings } = useSettings();

  // Le code de suivi n'est affiché qu'une fois, juste après la commande (jamais récupéré par simple numéro).
  if (!order || order.number !== number)
    return (
      <div className="container-page py-12">
        <div className="card mx-auto max-w-lg p-8 text-center">
          <h1 className="text-xl">Commande {number}</h1>
          <p className="mt-2 text-ink-soft">
            Pour consulter cette commande, utilisez son numéro et le code de suivi reçus par e-mail.
          </p>
          <ButtonLink to="/suivi" className="mt-5">
            Suivre ma commande
          </ButtonLink>
        </div>
      </div>
    );

  const steps =
    order.paymentMethod === 'cash'
      ? [
          'Nous préparons votre commande.',
          'Un livreur est attribué : vous recevez ses informations par e-mail.',
          'Vous payez en espèces à la réception.',
        ]
      : [
          'Envoyez le paiement Mobile Money avec votre numéro de commande en référence.',
          'Nous vérifions la réception des fonds, puis préparons la commande.',
          'Un livreur est attribué : vous recevez ses informations par e-mail.',
        ];

  return (
    <div className="container-page py-8 lg:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="card p-6 text-center sm:p-8">
          <div className="flex justify-center">
            <AnimatedCheck />
          </div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            <h1 className="mt-4 text-2xl sm:text-3xl">Merci, votre commande est enregistrée</h1>
            <p className="mt-2 text-ink-soft">
              Le récapitulatif et les étapes de livraison seront envoyés à {order.customer.email}.
            </p>
            <div className="mx-auto mt-5 grid max-w-md grid-cols-2 gap-3 text-left">
              <div className="rounded-md bg-ivory p-3">
                <p className="text-xs text-ink-muted">Numéro de commande</p>
                <p className="font-mono text-lg font-bold">{order.number}</p>
              </div>
              <div className="rounded-md bg-ivory p-3">
                <p className="text-xs text-ink-muted">Code de suivi</p>
                <p className="font-mono text-lg font-bold">{order.trackingCode}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              Conservez ces deux informations pour suivre votre commande sans compte.
            </p>
          </motion.div>
        </div>

        <PaymentInstructions order={order} settings={settings} />
        {order.paymentMethod !== 'cash' && (
          <div className="card px-6 pb-6">
            <PaymentDeclaration
              order={order}
              trackingCode={order.trackingCode}
              onDeclared={(o) =>
                setDeclared({ paymentStatus: o.paymentStatus, paymentDeclaration: o.paymentDeclaration ?? null })
              }
            />
          </div>
        )}

        <div className="card p-6">
          <h2 className="text-lg">Prochaines étapes</h2>
          <ol className="mt-3 space-y-2">
            {steps.map((s, i) => (
              <li key={s} className="flex gap-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-forest text-xs font-bold text-white">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </div>

        <div className="card p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg">Récapitulatif de commande</h2>
            <p className="text-xs text-ink-muted">
              Passée le {formatDateTime(order.createdAt)} · Ce document n’est pas une facture.
            </p>
          </div>
          <OrderItems order={order} />
          <div className="mt-4 border-t border-sage pt-4">
            <OrderTotalsTable order={order} />
          </div>
          <p className="mt-4 text-sm text-ink-soft">
            Livraison : {order.customer.recipient}, {order.customer.zoneName}, {order.customer.landmark}
          </p>
        </div>

        <div className="no-print flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button variant="outline" icon={<Printer className="size-4" />} onClick={() => window.print()}>
            Imprimer ou enregistrer en PDF
          </Button>
          <ButtonLink to={`/suivi?numero=${order.number}`}>Suivre ma commande</ButtonLink>
          <ButtonLink to="/catalogue" variant="ghost">
            Continuer mes achats
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
