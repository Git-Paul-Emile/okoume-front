import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { getErrorMessage } from '@/api/ApiError';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { ChatThread } from '@/features/marketplace/components/ChatThread';
import { useChat } from '@/features/marketplace/useChat';
import { sellerBackend } from '@/features/seller/seller.backend';
import { sellerChat } from '@/features/seller/seller.queries';
import { formatDateTime } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';

/** Conversation avec un acheteur (32.5) : réponse du vendeur et prix convenu. */
export default function SellerConversationPage() {
  const { id } = useParams();
  const { conversation, merge, loading, error, retry, send } = useChat(id, sellerChat);
  const [price, setPrice] = useState('');
  const [priceError, setPriceError] = useState('');
  const [agreeing, setAgreeing] = useState(false);

  if (loading) return <PageLoader />;
  if (error || !conversation)
    return <ErrorState title="Conversation introuvable" error={error} onRetry={() => void retry()} />;

  const agree = async (e: FormEvent) => {
    e.preventDefault();
    const value = Number(price.replace(/\s/g, ''));
    if (!Number.isInteger(value) || value < 1) return setPriceError('Prix en FCFA, nombre entier.');
    setPriceError('');
    setAgreeing(true);
    try {
      merge(await sellerBackend.agree(conversation.id, value));
      setPrice('');
    } catch (err) {
      setPriceError(getErrorMessage(err));
    } finally {
      setAgreeing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link to="/vendeur/messages" className="text-sm font-semibold text-forest hover:underline">
          Toutes les conversations
        </Link>
        <h2 className="text-xl">{conversation.listing.title}</h2>
      </div>

      {conversation.agreement ? (
        <p className="rounded-md bg-forest-50 p-3 text-sm text-forest" role="status">
          Prix convenu : <strong>{formatPrice(conversation.agreement.price)}</strong>, valable jusqu’au{' '}
          {formatDateTime(conversation.agreement.expiresAt)}.
        </p>
      ) : null}

      <form onSubmit={(e) => void agree(e)} noValidate className="card flex flex-wrap items-end gap-3 p-4">
        <TextField
          label="Proposer un prix à l’acheteur"
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          error={priceError || undefined}
          hint="Au plus le prix affiché. L’acheteur l’obtient pour sa demande d’achat, pendant une durée limitée."
        />
        <Button type="submit" variant="outline" loading={agreeing}>
          Proposer
        </Button>
      </form>

      <ChatThread conversation={conversation} viewer="seller" onSend={send} />
    </div>
  );
}
