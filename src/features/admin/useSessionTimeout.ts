import { useEffect } from 'react';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { endAdminSession } from './admin.queries';
import { toast } from '@/stores/toastStore';
import { readActivity, sessionExpired, writeActivity } from './loginGuard';

/**
 * Ferme la session du back-office après 60 minutes sans activité (souris, clavier, défilement),
 * y compris si l'onglet est rouvert plus tard. L'activité est partagée entre les onglets.
 */
export function useSessionTimeout() {
  const admin = useAdminAuthStore((s) => s.admin);

  useEffect(() => {
    if (!admin) return;
    const expire = () => {
      endAdminSession();
      toast.info('Session expirée', { description: 'Reconnectez-vous : aucune activité depuis 60 minutes.' });
    };
    if (sessionExpired(readActivity(), Date.now())) return expire();
    writeActivity(Date.now());

    let last = 0;
    const touch = () => {
      const now = Date.now();
      // Une écriture toutes les 30 secondes suffit
      if (now - last > 30_000) {
        last = now;
        writeActivity(now);
      }
    };
    const events = ['pointerdown', 'keydown', 'scroll', 'wheel'] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const timer = window.setInterval(() => sessionExpired(readActivity(), Date.now()) && expire(), 60_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      window.clearInterval(timer);
    };
  }, [admin]);
}
