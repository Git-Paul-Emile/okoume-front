/**
 * Journal de l'assistant d'administration (17.7) : question, données consultées, réponse, auteur.
 * Les coordonnées (e-mails, téléphones) sont masquées avant l'enregistrement. Le journal détaillé est
 * réservé à l'administrateur principal.
 */
export interface AssistantLogEntry {
  id: string;
  at: string;
  by: string;
  question: string;
  answer: string;
  /** Écran ou données de référence utilisés pour répondre. */
  source: string;
}

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
// Numéros gabonais : indicatif facultatif, puis 0X XX XX XX ; un montant (suivi d'autres chiffres) n'est pas concerné
const PHONE = /(?<!\d)(?:\+241[\s.-]?)?0?[1-7]\d?(?:[\s.-]?\d{2}){3}(?!\s?\d)/g;

export const maskSensitive = (text: string) =>
  text.replace(EMAIL, '[e-mail masqué]').replace(PHONE, '[téléphone masqué]');

export function logEntry(
  question: string,
  answer: { text: string; bullets?: string[]; link?: { to: string; label: string } },
  by: string,
  id: string,
  now = new Date().toISOString(),
): AssistantLogEntry {
  return {
    id,
    at: now,
    by,
    question: maskSensitive(question.trim()).slice(0, 300),
    answer: maskSensitive([answer.text, ...(answer.bullets ?? [])].join(' · ')).slice(0, 1000),
    source: answer.link?.to ?? 'Résumé et indicateurs',
  };
}
