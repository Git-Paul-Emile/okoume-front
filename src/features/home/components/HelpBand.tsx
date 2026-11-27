import { MessageCircle } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';
import { useSettings } from '@/features/settings/settings.queries';
import { whatsappLink } from '@/utils/whatsapp';

/** Accès au support WhatsApp depuis l'accueil. */
export function HelpBand() {
  const { data: settings } = useSettings();
  return (
    <Reveal className="flex flex-col items-start gap-5 rounded-lg border border-forest-100 bg-forest-50 p-6 sm:p-8 md:flex-row md:items-center">
      <div className="flex-1">
        <h2 className="text-xl">Une question avant de commander ?</h2>
        <p className="mt-1 text-ink-soft">
          Notre équipe est joignable sur WhatsApp
          {settings ? `, ${settings.support.hours.toLowerCase()}` : ''}.
        </p>
      </div>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        {settings && (
          <a
            href={whatsappLink(settings.support.whatsapp)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-forest px-5 font-semibold text-white transition hover:bg-forest-dark"
          >
            <MessageCircle className="size-5" />
            WhatsApp
          </a>
        )}
      </div>
    </Reveal>
  );
}
