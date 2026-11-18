import { Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/stores/toastStore';
import type { Listing } from '../marketplace.backend';
import { shareLink } from '../marketplace.utils';

/** Partage manuel de l'annonce (32.9) : rien n'est publié à la place de l'acheteur. */
export function ShareListing({ listing }: { listing: Listing }) {
  const url = shareLink(listing.slug);
  const text = `${listing.title} sur Okoumé`;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Lien copié');
    } catch {
      toast.info('Copie impossible', { description: url });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canShare && (
        <Button
          size="sm"
          variant="outline"
          icon={<Share2 className="size-4" />}
          onClick={() => void navigator.share({ title: listing.title, text, url }).catch(() => undefined)}
        >
          Partager
        </Button>
      )}
      <a
        className="text-sm font-semibold text-forest hover:underline"
        href={`https://wa.me/?text=${encodeURIComponent(`${text} : ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        WhatsApp
      </a>
      <a
        className="text-sm font-semibold text-forest hover:underline"
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Facebook
      </a>
      <Button size="sm" variant="ghost" icon={<Copy className="size-4" />} onClick={() => void copy()}>
        Copier le lien
      </Button>
    </div>
  );
}
