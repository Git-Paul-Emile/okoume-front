import { motion } from 'motion/react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { PaymentMethod } from '@/features/orders/orders.types';
import { cn } from '@/utils/text';
import { PaymentLogo } from './PaymentLogo';

/** Tous les paiements se font à la livraison, au livreur : en espèces ou par Mobile Money. */
const methods: Array<{ id: PaymentMethod; label: string; text: string }> = [
  {
    id: 'cash',
    label: 'Espèces à la livraison',
    text: 'Vous payez le livreur à la réception. Prévoyez le montant exact si possible.',
  },
  {
    id: 'airtel',
    label: 'Airtel Money à la livraison',
    text: 'Vous payez à la réception, depuis votre téléphone, en présence du livreur.',
  },
  {
    id: 'moov',
    label: 'Moov Money à la livraison',
    text: 'Vous payez à la réception, depuis votre téléphone, en présence du livreur.',
  },
];

export function PaymentStep({
  value,
  onBack,
  onNext,
}: {
  value: PaymentMethod | null;
  onBack: () => void;
  onNext: (m: PaymentMethod) => void;
}) {
  const [selected, setSelected] = useState<PaymentMethod | null>(value);
  const [error, setError] = useState('');

  return (
    <div className="space-y-5">
      <div role="radiogroup" aria-label="Moyen de paiement" className="space-y-3">
        {methods.map((m) => {
          const active = selected === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={m.label}
              onClick={() => {
                setSelected(m.id);
                setError('');
              }}
              className={cn(
                'relative flex w-full items-start gap-4 rounded-lg border p-4 text-left transition',
                active ? 'border-forest bg-forest-50' : 'border-sage-dark bg-white hover:border-forest',
              )}
            >
              <span className="grid size-11 shrink-0 place-items-center">
                <PaymentLogo method={m.id} className={m.id === 'cash' ? 'size-7' : 'size-11'} />
              </span>
              <span className="flex-1">
                <span className="block font-semibold">{m.label}</span>
                <span className="mt-0.5 block text-sm text-ink-soft">{m.text}</span>
              </span>
              <span
                className={cn(
                  'mt-1 grid size-5 place-items-center rounded-full border-2',
                  active ? 'border-forest' : 'border-sage-dark',
                )}
              >
                {active && <motion.span layoutId="pay-dot" className="size-2.5 rounded-full bg-forest" />}
              </span>
            </button>
          );
        })}
      </div>
      <p className="rounded-md bg-ivory p-3 text-sm text-ink-soft">
        Aucun paiement avant la livraison : vous réglez le livreur à la réception de votre commande.
      </p>
      {error && (
        <p className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <Button variant="outline" size="lg" onClick={onBack}>
          Retour
        </Button>
        <Button
          size="lg"
          onClick={() => (selected ? onNext(selected) : setError('Choisissez un moyen de paiement pour continuer.'))}
        >
          Vérifier ma commande
        </Button>
      </div>
    </div>
  );
}
