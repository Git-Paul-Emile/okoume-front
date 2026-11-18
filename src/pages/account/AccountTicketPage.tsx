import { motion } from 'motion/react';
import { supportImageUploader } from '@/features/support/support.backend';
import { Star } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useCurrentUser } from '@/features/auth/auth.queries';
import { categoryLabel } from '@/features/support/support.schemas';
import { useRateTicket, useReopenTicket, useReplyTicket, useTicket } from '@/features/support/support.queries';
import { useSettings } from '@/features/settings/settings.queries';
import { AttachmentList, AttachmentsPicker } from '@/components/ui/Upload';
import type { UploadedDocument } from '@/utils/upload';
import { ticketStatusLabel } from '@/features/support/support.constants';
import { toast } from '@/stores/toastStore';
import { formatDateTime } from '@/utils/formatDate';
import { cn } from '@/utils/text';

export default function AccountTicketPage() {
  const { number } = useParams();
  const { data: ticket, isLoading } = useTicket(number);
  const { user } = useCurrentUser();
  const reply = useReplyTicket();
  const rate = useRateTicket();
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState<UploadedDocument[]>([]);
  const [reopenReason, setReopenReason] = useState('');
  const reopen = useReopenTicket();
  const { data: settings } = useSettings();
  const [now] = useState(() => Date.now());

  if (isLoading) return <PageLoader />;
  if (!ticket || ticket.userId !== user?.id) return <ErrorState title="Demande introuvable" />;

  // Une demande résolue ou clôturée se rouvre pendant un délai configurable (15.3)
  const finished = ticket.status === 'resolved' || ticket.status === 'closed';
  const lastAt = new Date(ticket.messages.at(-1)?.at ?? ticket.createdAt).getTime();
  const reopenDays = settings?.reopenWindowDays ?? 15;
  const canReopen = finished && now - lastAt < reopenDays * 86_400_000;

  const reopenBlock = canReopen ? (
    <form
      className="mt-6 border-t border-sage pt-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (reopenReason.trim().length < 5) return setError('Expliquez en quelques mots pourquoi rouvrir la demande.');
        setError('');
        reopen.mutate(
          { ticket, value: reopenReason.trim() },
          {
            onSuccess: () => {
              setReopenReason('');
              toast.success('Demande rouverte', { description: 'Notre équipe va la reprendre.' });
            },
          },
        );
      }}
    >
      <label htmlFor="reopen" className="label">
        Le problème n’est pas réglé ?
      </label>
      <textarea
        id="reopen"
        rows={2}
        className="input"
        value={reopenReason}
        onChange={(e) => setReopenReason(e.target.value)}
        aria-invalid={!!error}
      />
      {error && <p className="mt-1.5 text-sm font-medium text-danger">{error}</p>}
      <p className="mt-1.5 text-xs text-ink-muted">
        Possible jusqu’au {formatDateTime(new Date(lastAt + reopenDays * 86_400_000).toISOString())}.
      </p>
      <Button type="submit" variant="outline" className="mt-3" loading={reopen.isPending}>
        Rouvrir la demande
      </Button>
    </form>
  ) : (
    <p className="mt-6 border-t border-sage pt-5 text-sm text-ink-soft">
      Cette demande est close. Pour un nouveau problème,{' '}
      <Link to="/compte/assistance" className="font-semibold text-forest hover:underline">
        ouvrez une nouvelle demande
      </Link>
      .
    </p>
  );

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (body.trim().length < 2) return setError('Écrivez votre message avant d’envoyer.');
    setError('');
    reply.mutate(
      { ticket, value: { body: body.trim(), attachments } },
      {
        onSuccess: () => {
          setBody('');
          setAttachments([]);
        },
        onError: () => toast.error('Le message n’a pas pu être envoyé.'),
      },
    );
  };

  return (
    <div className="space-y-5">
      <Link
        to="/compte/assistance"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:underline"
      >
        Mes demandes
      </Link>
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl">{ticket.subject}</h1>
            <p className="mt-1 text-xs text-ink-muted">
              {ticket.number} · {categoryLabel[ticket.category]}
              {ticket.orderNumber && ` · ${ticket.orderNumber}`}
            </p>
          </div>
          <Badge tone="forest">{ticketStatusLabel[ticket.status]}</Badge>
        </div>
        <ul className="mt-6 space-y-4">
          {ticket.messages.map((m, i) => (
            <motion.li
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn('flex', m.from === 'customer' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-xl px-4 py-3',
                  m.from === 'customer' ? 'rounded-br-sm bg-forest text-white' : 'rounded-bl-sm bg-ivory',
                )}
              >
                <p className="text-[15px] whitespace-pre-line">{m.body}</p>
                <AttachmentList items={m.attachments} tone={m.from === 'customer' ? 'dark' : 'light'} />
                <p className={cn('mt-1.5 text-xs', m.from === 'customer' ? 'text-white/70' : 'text-ink-muted')}>
                  {m.from === 'support' ? 'Service client · ' : ''}
                  {formatDateTime(m.at)}
                </p>
              </div>
            </motion.li>
          ))}
        </ul>
        {finished ? (
          reopenBlock
        ) : (
          <form onSubmit={send} className="mt-6 border-t border-sage pt-5">
            <label htmlFor="reply" className="label">
              Répondre
            </label>
            <textarea
              id="reply"
              rows={3}
              className="input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              aria-invalid={!!error}
            />
            {error && <p className="mt-1.5 text-sm font-medium text-danger">{error}</p>}
            <div className="mt-3">
              <AttachmentsPicker value={attachments} onChange={setAttachments} uploader={supportImageUploader} />
            </div>
            <Button type="submit" className="mt-3" loading={reply.isPending}>
              Envoyer
            </Button>
          </form>
        )}
      </div>
      {ticket.status === 'resolved' && (
        <div className="card p-6">
          <h2 className="text-base">Êtes-vous satisfait de la réponse ?</h2>
          <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Note de satisfaction">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={ticket.satisfaction === n}
                aria-label={`${n} sur 5`}
                onClick={() =>
                  rate.mutate({ ticket, value: n }, { onSuccess: () => toast.success('Merci pour votre retour') })
                }
                className="rounded-md p-1 transition hover:scale-110"
              >
                <Star
                  className={cn('size-8', (ticket.satisfaction ?? 0) >= n ? 'text-gold' : 'text-sage-dark')}
                  fill="currentColor"
                  strokeWidth={0}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
