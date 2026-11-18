import { CalendarClock, MapPin, PhoneCall, Truck } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { useDeliveryZones } from '@/features/delivery/delivery.queries';
import { formatPrice } from '@/utils/formatPrice';

const steps = [
  {
    icon: Truck,
    title: 'Préparation',
    text: 'Votre commande est préparée. Pour le Mobile Money, après vérification du paiement.',
  },
  {
    icon: PhoneCall,
    title: 'Livreur trouvé',
    text: 'Un livreur est attribué ; vous recevez ses informations par e-mail.',
  },
  { icon: MapPin, title: 'Livraison', text: 'Le livreur vous appelle et se rend à votre repère.' },
  {
    icon: CalendarClock,
    title: 'Confirmation',
    text: 'La commande est marquée livrée après confirmation de la remise.',
  },
];

export default function DeliveryInfoPage() {
  const { data: zones, isLoading } = useDeliveryZones();
  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: 'Livraison' }]} />
      <h1 className="text-2xl sm:text-3xl">Livraison et zones desservies</h1>
      <p className="mt-1.5 max-w-2xl text-ink-soft">
        Le tarif est fixe par quartier, quel que soit le nombre d’articles. Les délais sont indicatifs et confirmés
        selon la disponibilité des livreurs.
      </p>

      <RevealGroup className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <RevealItem key={s.title} className="card p-5">
            <span className="flex items-center gap-3">
              <span className="grid place-items-center text-forest">
                <s.icon className="size-5" />
              </span>
              <span className="text-xs font-bold text-ink-muted">Étape {i + 1}</span>
            </span>
            <h2 className="mt-3 text-base">{s.title}</h2>
            <p className="mt-1 text-sm text-ink-soft">{s.text}</p>
          </RevealItem>
        ))}
      </RevealGroup>

      <div className="card mt-8 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <caption className="sr-only">Tarifs et délais de livraison par quartier</caption>
          <thead className="bg-ivory text-xs tracking-wide text-ink-muted uppercase">
            <tr>
              <th className="px-5 py-3">Quartier</th>
              <th className="px-5 py-3">Commune</th>
              <th className="px-5 py-3">Tarif</th>
              <th className="px-5 py-3">Délai indicatif</th>
              <th className="px-5 py-3">Jours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sage">
            {isLoading && (
              <tr>
                <td colSpan={5} className="p-5">
                  <div className="skeleton h-6" />
                </td>
              </tr>
            )}
            {zones?.map((z) => (
              <tr key={z.id} className="hover:bg-ivory/60">
                <td className="px-5 py-3 font-semibold">{z.name}</td>
                <td className="px-5 py-3 text-ink-soft">{z.city}</td>
                <td className="px-5 py-3 tabular-nums">
                  {z.available ? formatPrice(z.fee) : <span className="text-warning">Sur confirmation</span>}
                </td>
                <td className="px-5 py-3">{z.eta}</td>
                <td className="px-5 py-3 text-ink-soft">{z.days}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-ink-muted">
        Votre quartier n’apparaît pas ? Vous pouvez commander : nous vous confirmerons la disponibilité et le tarif
        avant tout engagement. La livraison offerte n’est possible qu’avec un code promotionnel.
      </p>
    </div>
  );
}
