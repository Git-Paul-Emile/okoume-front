import { normalizeText } from '@/utils/text';

/** Recherche insensible aux accents et à la casse sur plusieurs champs. */
export function matches(query: string, ...fields: Array<string | null | undefined>) {
  const q = normalizeText(query);
  return !q || fields.some((f) => f && normalizeText(f).includes(q));
}
