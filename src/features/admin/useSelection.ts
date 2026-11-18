import { useState } from 'react';

/**
 * Élément ouvert dans un panneau de détail. On garde l'identifiant, pas l'objet,
 * pour que le panneau affiche toujours la version à jour après une action.
 */
export function useSelection<T extends { id: string }>(items: T[] | undefined) {
  const [id, setId] = useState<string | null>(null);
  const selected = id ? (items?.find((i) => i.id === id) ?? null) : null;
  return { selected, open: (item: T) => setId(item.id), close: () => setId(null) };
}
