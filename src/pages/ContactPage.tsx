import { Clock, Mail, MessageCircle, Phone } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useSettings } from '@/features/settings/settings.queries';
import { whatsappLink } from '@/utils/whatsapp';

export default function ContactPage() {
  const { data: settings } = useSettings();
  const advertising = useSearchParams()[0].get('sujet') === 'publicite';
  const contact = settings?.support;

  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: 'Contact' }]} />
      <h1 className="text-2xl sm:text-3xl">Nous contacter</h1>
      <p className="mt-1.5 max-w-2xl text-ink-soft">
        {advertising
          ? 'Pour toute question sur les espaces publicitaires, contactez directement notre équipe.'
          : 'Pour toute question sur Okoumé, contactez-nous par téléphone, e-mail ou WhatsApp.'}
      </p>

      {contact ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:max-w-3xl">
          <a
            href={whatsappLink(contact.whatsapp, advertising ? 'Bonjour, je souhaite des informations sur les espaces publicitaires.' : 'Bonjour, j’ai une question sur Okoumé.')}
            target="_blank"
            rel="noreferrer"
            className="card flex items-center gap-4 p-5 transition hover:border-forest"
          >
            <MessageCircle className="size-6 text-forest" />
            <span>
              <span className="block font-bold">WhatsApp</span>
              <span className="text-sm text-ink-soft">{contact.whatsapp}</span>
            </span>
          </a>
          <a href={`tel:${contact.phone}`} className="card flex items-center gap-4 p-5 transition hover:border-forest">
            <Phone className="size-6 text-forest" />
            <span>
              <span className="block font-bold">Téléphone</span>
              <span className="text-sm text-ink-soft">{contact.phone}</span>
            </span>
          </a>
          <a href={`mailto:${contact.email}`} className="card flex items-center gap-4 p-5 transition hover:border-forest">
            <Mail className="size-6 text-forest" />
            <span>
              <span className="block font-bold">E-mail</span>
              <span className="text-sm text-ink-soft">{contact.email}</span>
            </span>
          </a>
          <div className="card flex items-center gap-4 p-5">
            <Clock className="size-6 text-forest" />
            <span>
              <span className="block font-bold">Horaires</span>
              <span className="text-sm text-ink-soft">{contact.hours}</span>
            </span>
          </div>
        </div>
      ) : (
        <p className="card mt-8 max-w-3xl p-5 text-sm text-ink-soft">Les coordonnées de contact seront bientôt disponibles.</p>
      )}
    </div>
  );
}
