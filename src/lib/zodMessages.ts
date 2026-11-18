import { z } from 'zod';

/**
 * Messages de validation clairs, en français, pour tous les formulaires. Les messages écrits dans un schéma restent
 * prioritaires : celui-ci ne sert que lorsqu'aucun message n'est prévu (jamais « Invalid input: expected string »).
 */
const UNITS: Record<string, [string, string]> = {
  string: ['caractère', 'caractères'],
  array: ['élément', 'éléments'],
  set: ['élément', 'éléments'],
  file: ['octet', 'octets'],
};

const count = (n: number | bigint, origin: string) => {
  const unit = UNITS[origin];
  return unit ? `${n} ${Number(n) > 1 ? unit[1] : unit[0]}` : String(n);
};

const FORMATS: Record<string, string> = {
  email: 'Adresse e-mail invalide.',
  url: 'Adresse web invalide (elle commence par https://).',
  uuid: 'Identifiant invalide.',
  datetime: 'Date et heure invalides.',
  date: 'Date invalide.',
  time: 'Heure invalide.',
  regex: 'Format invalide.',
  starts_with: 'Format invalide.',
  ends_with: 'Format invalide.',
  includes: 'Format invalide.',
};

export function frenchMessage(issue: z.core.$ZodRawIssue): string {
  switch (issue.code) {
    case 'invalid_type':
      return issue.input === undefined || issue.input === null || issue.input === ''
        ? 'Ce champ est obligatoire.'
        : issue.expected === 'number' || issue.expected === 'int'
          ? 'Saisissez un nombre.'
          : 'Valeur invalide.';
    case 'too_small': {
      const origin = String(issue.origin ?? '');
      if ((origin === 'string' || origin === 'array') && Number(issue.minimum) <= 1)
        return origin === 'array' ? 'Choisissez au moins un élément.' : 'Ce champ est obligatoire.';
      if (origin === 'string') return `Saisissez au moins ${count(issue.minimum, origin)}.`;
      if (origin === 'array' || origin === 'set') return `Choisissez au moins ${count(issue.minimum, origin)}.`;
      return issue.inclusive === false
        ? `La valeur doit être supérieure à ${issue.minimum}.`
        : `La valeur doit être au moins ${issue.minimum}.`;
    }
    case 'too_big': {
      const origin = String(issue.origin ?? '');
      if (origin === 'string' || origin === 'array' || origin === 'set' || origin === 'file')
        return `${count(issue.maximum, origin)} au maximum.`;
      return issue.inclusive === false
        ? `La valeur doit être inférieure à ${issue.maximum}.`
        : `La valeur doit être au plus ${issue.maximum}.`;
    }
    case 'invalid_format':
      return FORMATS[issue.format] ?? 'Format invalide.';
    case 'not_multiple_of':
      return `La valeur doit être un multiple de ${issue.divisor}.`;
    case 'invalid_value':
    case 'invalid_union':
      return 'Choisissez une valeur proposée.';
    case 'unrecognized_keys':
      return `Champ non attendu : ${issue.keys.join(', ')}.`;
    default:
      return 'Valeur invalide.';
  }
}

/** À appeler une fois au démarrage, avant toute validation. */
export function installFrenchMessages() {
  z.config({ customError: frenchMessage });
}
