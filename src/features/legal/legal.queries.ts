import { useQuery } from '@tanstack/react-query';
import { legalDocs, type LegalDoc } from '@/pages/legalContent';
import { legalApi } from './legal.api';

/** Pages légales : version modifiée dans le back-office si elle existe, sinon le texte modèle. */
export function useLegalDocs() {
  const query = useQuery({ queryKey: ['legalPages'], queryFn: ({ signal }) => legalApi.list(signal) });
  const docs: Record<string, LegalDoc & { updatedAt?: string }> = { ...legalDocs };
  for (const page of query.data ?? []) docs[page.id] = page;
  return { ...query, docs };
}
