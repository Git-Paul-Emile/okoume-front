/** Destination masquée, pour ne pas afficher la donnée complète. */
export function maskTarget(target: string) {
  if (target.includes('@')) {
    const [name, domain] = target.split('@');
    return `${name[0]}${'•'.repeat(Math.max(2, name.length - 1))}@${domain}`;
  }
  const digits = target.replace(/\D/g, '');
  return `•• •• ${digits.slice(-4, -2)} ${digits.slice(-2)}`;
}
