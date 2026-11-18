import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuthStore } from '@/stores/authStore';

export function RequireAuth({ children }: { children: ReactNode }) {
  const userId = useAuthStore((s) => s.userId);
  const location = useLocation();
  if (!userId)
    return <Navigate to={`/connexion?retour=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}
