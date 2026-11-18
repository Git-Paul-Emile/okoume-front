import { useCallback, useState } from 'react';
import { uid } from '@/utils/ids';

const KEY = 'checkout-idempotency-key';

/** Clé stable pendant toute la tentative de commande, y compris après un rechargement de la page. */
export function useIdempotencyKey() {
  const [key, setKey] = useState(() => {
    try {
      const existing = sessionStorage.getItem(KEY);
      if (existing) return existing;
      const fresh = uid();
      sessionStorage.setItem(KEY, fresh);
      return fresh;
    } catch {
      return uid();
    }
  });

  const renew = useCallback(() => {
    const fresh = uid();
    try {
      sessionStorage.setItem(KEY, fresh);
    } catch {
      /* stockage indisponible : la clé reste en mémoire */
    }
    setKey(fresh);
  }, []);

  return { key, renew };
}
