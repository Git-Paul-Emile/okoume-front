import { useEffect } from 'react';
import { ApiError } from '@/api/ApiError';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { toast } from '@/stores/toastStore';
import { staffBackend } from './staff.backend';

/**
 * Révocation des sessions (19.2) : la session se ferme dès que le compte est suspendu, change de rôle
 * ou que ses sessions sont révoquées. Vérification toutes les 30 secondes et au retour sur l'onglet.
 * L'API relit le compte à chaque requête ; le contrôle relit aussi les droits : un changement
 * de rôle se reflète dans le menu sans reconnexion.
 */
export function useSessionGuard() {
  const admin = useAdminAuthStore((s) => s.admin);
  const setAdmin = useAdminAuthStore((s) => s.setAdmin);

  useEffect(() => {
    if (!admin) return;
    let stopped = false;
    const closed = () => {
      setAdmin(null);
      toast.info('Session fermée', {
        description: 'Votre accès a été modifié par l’administrateur principal. Reconnectez-vous si besoin.',
      });
    };
    const check = async () => {
      try {
        const current = await staffBackend.me();
        if (stopped) return;
        const changed = JSON.stringify(current.customPermissions) !== JSON.stringify(admin.customPermissions);
        if (changed || current.role !== admin.role) setAdmin({ ...current, loginAt: admin.loginAt });
      } catch (error) {
        // 401 ou 403 : session révoquée ou compte suspendu ; une panne réseau ne ferme rien
        if (!stopped && error instanceof ApiError && (error.status === 401 || error.status === 403)) closed();
      }
    };
    void check();
    const timer = window.setInterval(check, 30_000);
    const onFocus = () => void check();
    window.addEventListener('focus', onFocus);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [admin, setAdmin]);
}
