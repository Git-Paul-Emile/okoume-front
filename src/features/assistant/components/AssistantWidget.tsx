import { AnimatePresence, motion } from 'motion/react';
import { Bot, Send, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { useCategories } from '@/features/categories/categories.queries';
import { useDeliveryZones } from '@/features/delivery/delivery.queries';
import { useProducts } from '@/features/products/products.queries';
import { productSalePrice } from '@/features/products/products.utils';
import { useSettings } from '@/features/settings/settings.queries';
import { useUiStore } from '@/stores/uiStore';
import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/text';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/utils/formatDate';
import { answer, type AssistantReply } from '../assistant.engine';
import { ApiError } from '@/api/ApiError';
import { askAssistant, assistantApi } from '../assistant.api';
import { budgetExhausted, nextPeriodStart, takeMessageSlot } from '../assistantQuota';

interface Message extends AssistantReply {
  id: number;
  from: 'user' | 'bot';
}

const SUGGESTIONS = [
  'Téléphone moins de 300 000',
  'Livraison à Akanda',
  'Payer par Airtel Money',
  'Parler à un conseiller',
];

let msgId = 0;

export function AssistantWidget() {
  const open = useUiStore((s) => s.assistantOpen);
  const setOpen = useUiStore((s) => s.setAssistantOpen);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: ++msgId,
      from: 'bot',
      text: 'Bonjour ! Je suis l’assistant de la boutique. Je peux vous conseiller selon votre budget et répondre sur la livraison et le paiement. Je ne modifie jamais votre panier.',
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const products = useProducts();
  const categories = useCategories();
  const zones = useDeliveryZones();
  const settings = useSettings();
  const slug = location.pathname.startsWith('/produit/') ? location.pathname.split('/')[2] : null;
  const contextProduct = slug ? products.data?.find((p) => p.slug === slug) : null;
  const unavailable = products.isError;
  const qc = useQueryClient();
  const isMember = !!useAuthStore((s) => s.userId);
  const usage = useQuery({
    queryKey: ['assistant', 'usage'],
    queryFn: ({ signal }) => assistantApi.usage(signal),
    enabled: open,
    staleTime: 60_000,
  });
  // Budget mensuel atteint : l'assistant est suspendu, le reste du site fonctionne normalement (16.6)
  const suspended = budgetExhausted(usage.data?.count ?? 0, settings.data?.assistantMonthlyBudget);
  const [limitedUntil, setLimitedUntil] = useState<number | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const send = (text: string, e?: FormEvent) => {
    e?.preventDefault();
    const value = text.trim();
    if (!value || typing || suspended) return;
    // Limite par visiteur contre les abus (2.1)
    const retryAt = takeMessageSlot(isMember);
    setLimitedUntil(retryAt);
    if (retryAt) return;
    setInput('');
    // Les derniers échanges donnent le fil de la conversation au modèle (le message d'accueil est exclu)
    const history = messages
      .slice(1)
      .slice(-8)
      .map((m) => ({
        from: m.from === 'user' ? ('client' as const) : ('assistant' as const),
        text: m.text.slice(0, 2_000),
      }));
    setMessages((m) => [...m, { id: ++msgId, from: 'user', text: value }]);
    setTyping(true);
    void reply(value, history).then((r) => {
      setMessages((m) => [...m, { id: ++msgId, from: 'bot', ...r }]);
      setTyping(false);
      void qc.invalidateQueries({ queryKey: ['assistant', 'usage'] });
    });
  };

  /** L'assistant d'IA de l'API d'abord ; s'il est injoignable, les règles locales, sur les mêmes données publiques. */
  const reply = async (value: string, history: Array<{ from: 'client' | 'assistant'; text: string }>) => {
    try {
      const r = await askAssistant({ message: value, history, ...(slug ? { productSlug: slug } : {}) });
      const bySlug = new Map((products.data ?? []).map((p) => [p.slug, p]));
      const found = r.productSlugs.flatMap((s) => bySlug.get(s) ?? []);
      return { text: r.reply, ...(found.length ? { products: found } : {}) } satisfies AssistantReply;
    } catch (error) {
      // Plafond mensuel atteint : le message de l'API l'explique au client
      if (error instanceof ApiError && error.status === 429) return { text: error.message } satisfies AssistantReply;
      await assistantApi.record().catch(() => undefined);
      return answer(value, {
        products: products.data ?? [],
        categories: categories.data?.all ?? [],
        zones: zones.data ?? [],
        settings: settings.data ?? null,
        contextProduct,
      });
    }
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            className="no-print fixed right-4 bottom-4 z-40 flex h-14 items-center gap-2 rounded-xl bg-forest px-4 font-semibold text-white shadow-[var(--shadow-lift)] sm:right-6 sm:bottom-6"
            aria-label="Ouvrir l’assistant d’achat"
          >
            <Bot className="size-6" />
            <span className="hidden sm:inline">Besoin d’un conseil ?</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.section
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            style={{ transformOrigin: 'bottom right' }}
            className="no-print fixed inset-x-2 bottom-2 z-50 flex h-[min(620px,calc(100dvh-1rem))] flex-col overflow-hidden rounded-xl border border-sage bg-white shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[390px]"
            aria-label="Assistant d’achat"
          >
            <header className="flex items-center gap-3 bg-forest px-4 py-3.5 text-white">
              <span className="grid size-10 place-items-center">
                <Bot className="size-5" />
              </span>
              <div className="flex-1">
                <h2 className="text-[15px] font-bold text-white">Assistant d’achat</h2>
                <p className="text-xs text-white/75">
                  {contextProduct
                    ? `À propos de : ${contextProduct.name}`
                    : 'Réponses basées sur le catalogue en ligne'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-2 hover:bg-white/15"
                aria-label="Fermer l’assistant"
              >
                <X className="size-5" />
              </button>
            </header>

            <div
              ref={listRef}
              className="flex-1 space-y-3 overflow-y-auto bg-ivory/60 p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-live="polite"
            >
              {suspended && (
                <p className="rounded-md bg-mure-50 p-3 text-sm text-mure-dark" role="status">
                  L’assistant est suspendu jusqu’au {formatDateTime(nextPeriodStart().toISOString())}. Le catalogue, le
                  panier et les commandes restent disponibles ; un conseiller vous répond sur WhatsApp ou depuis la{' '}
                  <Link to="/contact" className="font-semibold underline">
                    page Contact
                  </Link>
                  .
                </p>
              )}
              {limitedUntil && (
                <p className="rounded-md bg-mure-50 p-3 text-sm text-mure-dark" role="status">
                  Vous avez envoyé beaucoup de messages : vous pourrez en écrire de nouveaux à partir de{' '}
                  {formatDateTime(new Date(limitedUntil).toISOString())}.{' '}
                  {!isMember && 'Connecté à votre compte, la limite est plus élevée. '}
                  Un conseiller reste joignable depuis la{' '}
                  <Link to="/contact" className="font-semibold underline">
                    page Contact
                  </Link>
                  .
                </p>
              )}
              {unavailable && (
                <p className="rounded-md bg-mure-50 p-3 text-sm text-mure-dark">
                  L’assistant est momentanément indisponible. Le catalogue et le panier restent utilisables ; vous
                  pouvez aussi nous écrire depuis la page Contact.
                </p>
              )}
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex', m.from === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[88%] rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-line',
                      m.from === 'user'
                        ? 'rounded-br-sm bg-forest text-white'
                        : 'rounded-bl-sm border border-sage bg-white text-ink',
                    )}
                  >
                    {m.text}
                    {m.products && (
                      <ul className="mt-2.5 space-y-2">
                        {m.products.map((p) => {
                          const { price } = productSalePrice(p);
                          return (
                            <li key={p.id}>
                              <Link
                                to={`/produit/${p.slug}`}
                                className="flex items-center gap-2.5 rounded-lg border border-sage p-2 transition hover:border-forest"
                              >
                                <img
                                  src={p.thumbnail}
                                  alt=""
                                  className="size-11 rounded-md bg-ivory object-contain p-1"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-semibold">{p.name}</span>
                                  <span className="text-xs font-bold text-forest">{formatPrice(price)}</span>
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {m.links && (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {m.links.map((l) =>
                          l.external ? (
                            <a
                              key={l.to}
                              href={l.to}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md bg-forest-50 px-2.5 py-1 text-xs font-semibold text-forest hover:bg-forest-100"
                            >
                              {l.label}
                            </a>
                          ) : (
                            <Link
                              key={l.to}
                              to={l.to}
                              className="rounded-md bg-forest-50 px-2.5 py-1 text-xs font-semibold text-forest hover:bg-forest-100"
                            >
                              {l.label}
                            </Link>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {typing && (
                <div
                  className="flex w-16 items-center justify-center gap-1 rounded-xl rounded-bl-sm border border-sage bg-white px-3 py-3"
                  aria-label="L’assistant écrit"
                >
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="size-1.5 rounded-full bg-ink-muted"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }}
                    />
                  ))}
                </div>
              )}
            </div>

            {messages.length < 3 && (
              <div className="flex gap-2 overflow-x-auto border-t border-sage px-3 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="shrink-0 rounded-md border border-sage-dark px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-ink-soft hover:border-forest hover:text-forest"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={(e) => send(input, e)} className="flex items-center gap-2 border-t border-sage p-3">
              <label htmlFor="assistant-input" className="sr-only">
                Votre question
              </label>
              <input
                id="assistant-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Votre question…"
                className="input h-11 flex-1 py-0"
                maxLength={300}
                autoComplete="off"
              />
              <button
                type="submit"
                className="grid size-11 place-items-center rounded-md bg-forest text-white transition hover:bg-forest-dark disabled:opacity-50"
                disabled={!input.trim() || typing || suspended}
                aria-label="Envoyer"
              >
                <Send className="size-[18px]" />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
