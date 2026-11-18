import type { ZodError } from 'zod';

/** Transforme les erreurs Zod en dictionnaire champ → premier message. */
export function fieldErrors(error: ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
