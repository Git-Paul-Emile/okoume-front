import { useQuery } from '@tanstack/react-query';
import { useSettings } from '@/features/settings/settings.queries';
import { buildLegalDocs, type LegalDoc } from '@/pages/legalContent';
import { legalApi } from './legal.api';

/**
 * Pages légales : version modifiée dans le back-office si elle existe, sinon le texte modèle, complété avec les
 * paramètres réels de la boutique (délais, fidélité, raison sociale, NIF, RCCM, contact).
 */
export function useLegalDocs() {
  const query = useQuery({ queryKey: ['legalPages'], queryFn: ({ signal }) => legalApi.list(signal) });
  const { data: settings } = useSettings();
  const docs: Record<string, LegalDoc & { updatedAt?: string }> = { ...buildLegalDocs(settings ?? undefined) };
  for (const page of query.data ?? []) docs[page.id] = page;
  return { ...query, docs };
}
