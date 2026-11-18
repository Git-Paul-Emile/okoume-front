import { Banknote } from 'lucide-react';
import type { PaymentMethod } from '@/features/orders/orders.types';
import { cn } from '@/utils/text';

const logos: Record<Exclude<PaymentMethod, 'cash'>, { src: string; alt: string }> = {
  airtel: { src: '/payments/airtel-money.png', alt: 'Airtel Money' },
  moov: { src: '/payments/moov-money.jpg', alt: 'Moov Money' },
};

/** Logo de l'opérateur Mobile Money, ou icône billet pour les espèces. */
export function PaymentLogo({ method, className }: { method: PaymentMethod; className?: string }) {
  if (method === 'cash') return <Banknote className={cn('text-forest', className)} aria-hidden="true" />;
  const logo = logos[method];
  return (
    <img src={logo.src} alt={logo.alt} width={44} height={44} className={cn('rounded-md object-cover', className)} />
  );
}
