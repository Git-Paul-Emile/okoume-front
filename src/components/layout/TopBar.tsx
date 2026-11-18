import { Headphones, MapPin, PackageSearch } from 'lucide-react';
import { PaymentLogo } from '@/features/checkout/components/PaymentLogo';
import { Link } from 'react-router';

export function TopBar() {
  return (
    <div className="bg-ink text-[13px] text-white/90">
      <div className="container-page flex h-10 items-center justify-between gap-4">
        <ul className="flex items-center gap-6 overflow-x-auto whitespace-nowrap">
          <li className="flex items-center gap-2">
            <MapPin className="size-4 text-forest-100" /> Livraison à Libreville, Akanda et Owendo
          </li>
          <li className="hidden items-center gap-2 md:flex">
            <PaymentLogo method="airtel" className="size-5 rounded-sm" />
            <PaymentLogo method="moov" className="size-5 rounded-sm" /> Espèces, Airtel Money, Moov Money
          </li>
          <li className="hidden items-center gap-2 lg:flex">
            <Headphones className="size-4 text-forest-100" /> Assistance du lundi au samedi
          </li>
        </ul>
        <Link to="/suivi" className="hidden items-center gap-2 font-medium hover:text-white sm:flex">
          <PackageSearch className="size-4" /> Suivre ma commande
        </Link>
      </div>
    </div>
  );
}
