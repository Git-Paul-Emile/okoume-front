import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Link } from 'react-router';
import { Logo } from '@/components/ui/Logo';
import { brand } from '@/config/brand';
import { useSettings } from '@/features/settings/settings.queries';
import { PaymentLogo } from '@/features/checkout/components/PaymentLogo';
import { whatsappLink } from '@/utils/whatsapp';
import { useInstallPrompt } from '@/lib/pwa';
import { useConsentStore } from '@/stores/consentStore';
import { useSellerShop } from '@/features/seller/seller.queries';
import { footerLinks, legalLinks } from './navigation';

const social: Record<string, { label: string; path: string }> = {
  facebook: {
    label: 'Facebook',
    path: 'M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v9h4v-9H16l.5-4h-3V8.9c0-.6.3-.9.5-.9Z',
  },
  instagram: {
    label: 'Instagram',
    path: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm5.5-1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z',
  },
  tiktok: {
    label: 'TikTok',
    path: 'M15 3c.4 2.3 1.9 3.8 4 4v3.3c-1.5 0-2.8-.4-4-1.2V15a6 6 0 1 1-6-6v3.4a2.6 2.6 0 1 0 2.6 2.6V3H15Z',
  },
};

export function Footer() {
  const { data: settings } = useSettings();
  const support = settings?.support;
  const openCookies = useConsentStore((s) => s.openPreferences);
  const { data: sellerShop } = useSellerShop();
  const { canInstall, install } = useInstallPrompt();

  return (
    <footer className="mt-16 bg-ink text-white/80">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1.3fr]">
        <div>
          <Logo tone="light" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Boutique en ligne basée à {brand.city}. Commandez sans créer de compte, payez à la livraison ou par Mobile
            Money.
          </p>
          {settings && (
            <ul className="mt-5 flex gap-2">
              {Object.entries(settings.social).map(([key, href]) =>
                social[key] && href ? (
                  <li key={key}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="grid size-9 place-items-center text-white/80 transition hover:text-white"
                      aria-label={social[key].label}
                    >
                      <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden="true">
                        <path d={social[key].path} fillRule="evenodd" />
                      </svg>
                    </a>
                  </li>
                ) : null,
              )}
            </ul>
          )}
        </div>
        {Object.entries(footerLinks).map(([title, links]) => (
          <div key={title}>
            <h2 className="mb-4 text-sm font-bold text-white">{title}</h2>
            <ul className="space-y-2.5 text-sm">
              {links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="transition hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
              {title === 'Mon compte' && (
                <li>
                  <Link to={sellerShop ? '/vendeur' : '/devenir-vendeur'} className="transition hover:text-white">
                    {sellerShop ? 'Gérer ma boutique' : 'Vendre sur OKOUMÉ'}
                  </Link>
                </li>
              )}
            </ul>
          </div>
        ))}
        <div>
          <h2 className="mb-4 text-sm font-bold text-white">Nous joindre</h2>
          {support && (
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href={whatsappLink(support.whatsapp)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 hover:text-white"
                >
                  <MessageCircle className="size-4 shrink-0 text-forest-100" /> WhatsApp
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="size-4 shrink-0 text-forest-100" /> {support.phone}
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="size-4 shrink-0 text-forest-100" /> {support.email}
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="size-4 shrink-0 text-forest-100" /> {support.address}
              </li>
              <li className="flex items-center gap-2.5">
                <Clock className="size-4 shrink-0 text-forest-100" /> {support.hours}
              </li>
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-4 py-5 pb-24 text-xs sm:pb-5 lg:pr-56 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {brand.name}. Tous droits réservés. Développé par{' '}
            <a
              href="https://bright-selkie-bdc0a4.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white hover:underline"
            >
              PE
            </a>
            .
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {legalLinks.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <button type="button" onClick={openCookies} className="hover:text-white">
                Gérer les cookies
              </button>
            </li>
            {canInstall && (
              <li>
                <button
                  type="button"
                  onClick={() => void install()}
                  className="font-semibold text-white hover:underline"
                >
                  Installer l’application
                </button>
              </li>
            )}
          </ul>
          <ul className="flex gap-2" aria-label="Moyens de paiement acceptés">
            <li className="flex h-8 items-center rounded-sm border border-white/20 px-2 font-semibold text-white">
              Espèces
            </li>
            <li>
              <PaymentLogo method="airtel" className="size-8" />
            </li>
            <li>
              <PaymentLogo method="moov" className="size-8" />
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
