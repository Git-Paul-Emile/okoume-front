import { motion } from 'motion/react';
import { CheckCircle2, Clock, Mail, MessageCircle, Phone } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ButtonLink } from '@/components/ui/Button';
import { useCurrentUser } from '@/features/auth/auth.queries';
import { TicketForm } from '@/features/support/components/TicketForm';
import type { Ticket } from '@/features/support/support.types';
import { useSettings } from '@/features/settings/settings.queries';
import { whatsappLink } from '@/utils/whatsapp';

export default function ContactPage() {
  const { data: settings } = useSettings();
  const { isAuthenticated } = useCurrentUser();
  const [created, setCreated] = useState<Ticket | null>(null);
  const advertising = useSearchParams()[0].get('sujet') === 'publicite';
  const s = settings?.support;

  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: 'Contact' }]} />
      <h1 className="text-2xl sm:text-3xl">Nous contacter</h1>
      <p className="mt-1.5 max-w-2xl text-ink-soft">
        Une question sur une commande, un produit ou une livraison ? Écrivez-nous : nous répondons en général sous un
        jour ouvré. Ce délai est indicatif.
      </p>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card p-6 sm:p-8">
          {created ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 text-center"
            >
              <CheckCircle2 className="mx-auto size-14 text-forest" />
              <h2 className="mt-3 text-xl">Demande {created.number} enregistrée</h2>
              <p className="mt-2 text-ink-soft">
                Nous vous répondrons à {created.email}.{' '}
                {isAuthenticated
                  ? 'Vous pouvez suivre cet échange depuis votre compte.'
                  : 'Conservez ce numéro pour toute relance.'}
              </p>
              {isAuthenticated && (
                <ButtonLink to={`/compte/assistance/${created.number}`} className="mt-5">
                  Suivre ma demande
                </ButtonLink>
              )}
            </motion.div>
          ) : (
            <TicketForm
              onCreated={setCreated}
              defaultCategory={advertising ? 'publicite' : undefined}
              defaultSubject={advertising ? 'Réserver l’espace publicitaire de l’accueil' : undefined}
            />
          )}
        </div>
        <aside className="space-y-4">
          {s && (
            <>
              <a
                href={whatsappLink(s.whatsapp, 'Bonjour, j’ai une question :')}
                target="_blank"
                rel="noreferrer"
                className="card flex items-center gap-4 p-5 transition hover:border-forest"
              >
                <span className="grid place-items-center text-forest">
                  <MessageCircle className="size-6" />
                </span>
                <span>
                  <span className="block font-bold">WhatsApp</span>
                  <span className="text-sm text-ink-soft">Réponse rapide aux heures d’ouverture</span>
                </span>
              </a>
              <div className="card space-y-3 p-5 text-sm">
                <p className="flex items-center gap-3">
                  <Phone className="size-4 text-forest" /> {s.phone}
                </p>
                <p className="flex items-center gap-3">
                  <Mail className="size-4 text-forest" /> {s.email}
                </p>
                <p className="flex items-center gap-3">
                  <Clock className="size-4 text-forest" /> {s.hours}
                </p>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
