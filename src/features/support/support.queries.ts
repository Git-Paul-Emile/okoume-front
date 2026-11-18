import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { supportApi } from './support.api';
import type { TicketInput } from './support.schemas';
import type { Attachment, Ticket } from './support.types';

export function useMyTickets() {
  const userId = useAuthStore((s) => s.userId);
  return useQuery({
    queryKey: ['tickets', userId],
    queryFn: ({ signal }) => supportApi.mine(userId!, signal),
    enabled: !!userId,
  });
}

export function useTicket(number: string | undefined) {
  const userId = useAuthStore((s) => s.userId);
  return useQuery({
    queryKey: ['tickets', 'number', number],
    queryFn: ({ signal }) => supportApi.byNumber(number!, userId, signal),
    enabled: !!number,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  return useMutation({
    mutationFn: ({ attachments, ...input }: TicketInput & { attachments?: Attachment[] }) =>
      supportApi.create(input, userId, attachments),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
}

function useTicketMutation<V>(fn: (t: Ticket, v: V) => Promise<Ticket>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticket, value }: { ticket: Ticket; value: V }) => fn(ticket, value),
    onSuccess: (t) => {
      qc.setQueryData(['tickets', 'number', t.number], t);
      void qc.invalidateQueries({ queryKey: ['tickets'], exact: false });
    },
  });
}

export const useReplyTicket = () =>
  useTicketMutation<{ body: string; attachments?: Attachment[] }>((t, v) => supportApi.reply(t, v));
export const useReopenTicket = () => useTicketMutation<string>((t, reason) => supportApi.reopen(t, reason));
export const useRateTicket = () => useTicketMutation<number>((t, n) => supportApi.rate(t, n));
