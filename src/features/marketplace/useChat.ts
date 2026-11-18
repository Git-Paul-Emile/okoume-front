import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import type { Id } from '@/api/types';
import { marketplaceBackend, type ChatMessage, type Conversation } from './marketplace.backend';
import { mergeMessages } from './marketplace.utils';

/** Intervalle de relève des nouveaux messages : la réponse de l'assistant arrive quelques secondes après. */
export const POLL_MS = 4_000;

/** Côté de la conversation : l'acheteur et le vendeur lisent les mêmes conversations par des routes distinctes. */
export interface ChatSource {
  scope: 'buyer' | 'seller';
  get: (id: Id, since?: string, signal?: AbortSignal) => Promise<Conversation>;
  send: (id: Id, body: string) => Promise<ChatMessage>;
  close?: (id: Id) => Promise<Conversation>;
}

export const buyerChat: ChatSource = {
  scope: 'buyer',
  get: marketplaceBackend.conversation,
  send: marketplaceBackend.send,
  close: marketplaceBackend.closeConversation,
};

export const chatKey = (scope: ChatSource['scope'], id: Id | undefined) => ['conversations', scope, id] as const;

/**
 * Conversation suivie en direct : chargement complet, puis relève des messages écrits depuis le dernier reçu,
 * tant que l'onglet est visible. La conversation vit dans le cache des requêtes, complété à chaque relève.
 */
export function useChat(id: Id | undefined, source: ChatSource = buyerChat) {
  const qc = useQueryClient();
  const key = chatKey(source.scope, id);
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => source.get(id!, undefined, signal),
    enabled: !!id,
  });
  const conversation = query.data ?? null;

  const merge = useCallback(
    (fresh: Conversation | ((current: Conversation) => Conversation)) =>
      qc.setQueryData<Conversation>(chatKey(source.scope, id), (current) => {
        if (!current) return typeof fresh === 'function' ? current : fresh;
        const next = typeof fresh === 'function' ? fresh(current) : fresh;
        return { ...next, messages: mergeMessages(current.messages, next.messages) };
      }),
    [qc, id, source.scope],
  );

  const last = conversation?.messages.at(-1)?.createdAt;
  const ready = conversation !== null;
  const { get } = source;
  useEffect(() => {
    if (!id || !ready) return;
    let stopped = false;
    const poll = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const fresh = await get(id, last);
        if (!stopped) merge(fresh);
      } catch {
        // Relève suivante : une coupure passagère ne doit pas interrompre la conversation
      }
    };
    const timer = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [id, ready, last, merge, get]);

  const send = useCallback(
    async (body: string) => {
      if (!id) return;
      const message = await source.send(id, body);
      merge((c) => ({ ...c, status: 'open', messages: [message] }));
      void qc.invalidateQueries({ queryKey: ['conversations', source.scope, 'list'] });
    },
    [id, merge, qc, source],
  );

  const close = useCallback(async () => {
    if (!id || !source.close) return;
    merge(await source.close(id));
  }, [id, merge, source]);

  return { conversation, merge, loading: query.isLoading, error: query.error, retry: query.refetch, send, close };
}
