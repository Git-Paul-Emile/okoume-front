/** Règle de mot de passe de l'équipe (19.2), contrôlée dans le formulaire d'invitation. */
export function passwordError(password: string, confirm: string): string | null {
  if (password.length < 12) return 'Le mot de passe doit contenir au moins 12 caractères.';
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) return 'Utilisez au moins une lettre et un chiffre.';
  if (password !== confirm) return 'Les deux mots de passe sont différents.';
  return null;
}
