import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from '@playwright/test';
import { LOG_DIR } from './stack';

interface LoggedEmail {
  at: number;
  to: string;
  subject: string;
  body: string;
}

/**
 * Boîte de réception de test : sans clé Resend, le worker de l'API écrit chaque e-mail dans ses logs
 * (devEmailSender). On relit ces lignes JSON.
 */
function emails(): LoggedEmail[] {
  const file = join(LOG_DIR, 'worker.log');
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('"E-mail (développement)"'))
    .map((l) => JSON.parse(l) as { time: string; email: Omit<LoggedEmail, 'at'> })
    .map(({ time, email }) => ({ ...email, at: Date.parse(time) }));
}

/** Attend l'e-mail le plus récent pour ce destinataire et ce sujet, envoyé après `since`. */
export async function waitForEmail(to: string, subject: RegExp, since: number) {
  let found: LoggedEmail | undefined;
  await expect
    .poll(
      () => {
        found = emails()
          .filter((e) => e.to === to && subject.test(e.subject) && e.at >= since - 1000)
          .at(-1);
        return found !== undefined;
      },
      { message: `e-mail « ${subject.source} » pour ${to}`, timeout: 30_000 },
    )
    .toBe(true);
  return found as LoggedEmail;
}

/** Code à 6 chiffres contenu dans un e-mail */
export const sixDigitCode = (email: LoggedEmail) => {
  const code = /\b(\d{6})\b/.exec(email.body)?.[1];
  if (!code) throw new Error(`Aucun code dans l'e-mail « ${email.subject} »`);
  return code;
};
