import { contentBackend } from '@/features/home/content.backend';
import type { LegalDoc } from '@/pages/legalContent';

/** Version d'une page légale modifiée depuis le back-office (identifiant = adresse : cgv, confidentialite…). */
export interface LegalPageRecord extends LegalDoc {
  id: string;
  updatedAt: string;
}

export const legalApi = {
  list: (signal?: AbortSignal): Promise<LegalPageRecord[]> => contentBackend.legalPages(signal),
};
