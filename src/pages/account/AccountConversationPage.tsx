import { Link, useParams } from 'react-router';
import { getErrorMessage } from '@/api/ApiError';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ChatThread } from '@/features/marketplace/components/ChatThread';
import { useChat } from '@/features/marketplace/useChat';
import { toast } from '@/stores/toastStore';
import { formatDateTime } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';

/** Tchat avec le vendeur (32.5) : messages, prix convenu, relève automatique des réponses. */
export default function AccountConversationPage() {
  const { id } = useParams();
  const { conversation, loading, error, retry, send, close } = useChat(id);

  if (loading) return <PageLoader />;
  if (error || !conversation)
    return <ErrorState title="Conversation introuvable" error={error} onRetry={() => void retry()} />;

  const { agreement } = conversation;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link to="/compte/messages" className="text-sm font-semibold text-forest hover:underline">
            Mes messages
          </Link>
          <h1 className="text-xl">{conversation.listing.title}</h1>
          <p className="text-sm text-ink-muted">{conversation.shop.name}</p>
        </div>
        <div className="flex gap-2">
          <ButtonLink to={`/annonces/${conversation.listing.slug}`} size="sm" variant="outline">
            Voir l’annonce
          </ButtonLink>
          {conversation.status === 'open' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                void close().catch((err: unknown) =>
                  toast.error('Fermeture impossible', { description: getErrorMessage(err) }),
                )
              }
            >
              Clore
            </Button>
          )}
        </div>
      </div>

      {agreement && (
        <div className="rounded-md bg-forest-50 p-4 text-sm text-forest" role="status">
          Prix convenu : <strong>{formatPrice(agreement.price)}</strong>, valable jusqu’au{' '}
          {formatDateTime(agreement.expiresAt)}. Il s’applique à votre demande d’achat depuis l’annonce.
        </div>
      )}
      {conversation.needsSeller && (
        <p className="rounded-md bg-ivory p-3 text-sm text-ink-soft">Votre question a été transmise au vendeur.</p>
      )}

      <ChatThread conversation={conversation} viewer="buyer" onSend={send} />
    </div>
  );
}
