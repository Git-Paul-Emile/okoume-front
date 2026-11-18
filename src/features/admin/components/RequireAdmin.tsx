import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAdminAuthStore } from '@/stores/adminAuthStore';

/** Garde d'interface uniquement : l'API doit refuser elle-même toute requête d'un compte non autorisé. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const admin = useAdminAuthStore((s) => s.admin);
  const location = useLocation();
  if (!admin) return <Navigate to={`/admin/connexion?retour=${encodeURIComponent(location.pathname)}`} replace />;
  return <>{children}</>;
}
