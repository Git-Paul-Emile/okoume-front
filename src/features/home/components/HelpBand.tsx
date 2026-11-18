import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { useSettings } from '@/features/settings/settings.queries';
import { useUiStore } from '@/stores/uiStore';
import { whatsappLink } from '@/utils/whatsapp';

/** Accès à l'assistance et à l'assistant IA depuis l'accueil. */
export function HelpBand() {
  const { data: settings } = useSettings();
  const openAssistant = useUiStore((s) => s.setAssistantOpen);
  return (
    <Reveal className="flex flex-col items-start gap-5 rounded-lg border border-forest-100 bg-forest-50 p-6 sm:p-8 md:flex-row md:items-center">
      <div className="flex-1">
        <h2 className="text-xl">Une question avant de commander ?</h2>
        <p className="mt-1 text-ink-soft">
          Notre assistant vous répond tout de suite sur les produits, la livraison et le paiement. Pour un cas
          particulier, notre équipe est joignable sur WhatsApp
          {settings ? `, ${settings.support.hours.toLowerCase()}` : ''}.
        </p>
      </div>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Button onClick={() => openAssistant(true)} icon={<Bot className="size-5" />}>
          Demander à l’assistant
        </Button>
        {settings && (
          <a
            href={whatsappLink(settings.support.whatsapp)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-forest bg-white px-5 font-semibold text-forest transition hover:bg-forest hover:text-white"
          >
            WhatsApp
          </a>
        )}
      </div>
    </Reveal>
  );
}
