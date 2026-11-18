import { Send } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/api/ApiError';
import { Button } from '@/components/ui/Button';
import { toast } from '@/stores/toastStore';
import { formatDateTime } from '@/utils/formatDate';
import { cn } from '@/utils/text';
import type { ChatMessage, Conversation } from '../marketplace.backend';

const MAX_LENGTH = 1_000;

type Viewer = 'buyer' | 'seller';

/** Auteur affiché : l'assistant de la boutique est nommé comme tel, jamais présenté comme le vendeur. */
function authorLabel(m: ChatMessage, viewer: Viewer, shopName: string) {
  if (m.author === viewer) return 'Vous';
  if (m.author === 'buyer') return 'Acheteur';
  if (m.author === 'seller') return shopName;
  if (m.author === 'assistant') return viewer === 'seller' ? 'Votre assistant' : `Assistant de ${shopName}`;
  return 'Okoumé';
}

/** Fil de messages et zone de saisie, partagés par l'acheteur et le vendeur. */
export function ChatThread({
  conversation,
  viewer,
  onSend,
}: {
  conversation: Conversation;
  viewer: Viewer;
  onSend: (body: string) => Promise<void>;
}) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const count = conversation.messages.length;

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [count]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      await onSend(body);
      setBody('');
    } catch (err) {
      toast.error('Message non envoyé', { description: getErrorMessage(err) });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="card max-h-[60vh] min-h-64 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {conversation.messages.map((m) => {
          const own = m.author === viewer;
          return (
            <div key={m.id} className={cn('flex', own ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                  own && 'bg-forest text-white',
                  !own && m.author !== 'assistant' && m.author !== 'system' && 'bg-ivory text-ink',
                  m.author === 'assistant' && !own && 'border border-sage bg-white text-ink',
                  m.author === 'system' && 'bg-transparent text-xs text-ink-muted italic',
                )}
              >
                {!own && (
                  <p className="mb-0.5 text-xs font-semibold">{authorLabel(m, viewer, conversation.shop.name)}</p>
                )}
                <p className="whitespace-pre-line">{m.body}</p>
                <p className={cn('mt-1 text-[11px]', own ? 'text-white/75' : 'text-ink-muted')}>
                  {formatDateTime(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <form onSubmit={(e) => void submit(e)} className="flex items-end gap-2">
        <label htmlFor="chat-message" className="sr-only">
          Votre message
        </label>
        <textarea
          id="chat-message"
          rows={2}
          maxLength={MAX_LENGTH}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            conversation.status === 'closed' && viewer === 'buyer' ? 'Écrire rouvre la conversation' : 'Votre message'
          }
          className="input min-h-12 flex-1 resize-y"
        />
        <Button type="submit" loading={sending} disabled={!body.trim()} icon={<Send className="size-4" />}>
          Envoyer
        </Button>
      </form>
      <p className="text-xs text-ink-muted">
        Ne communiquez ni code Mobile Money ni mot de passe : le paiement se règle entre acheteur et vendeur, à la
        remise.
      </p>
    </div>
  );
}
