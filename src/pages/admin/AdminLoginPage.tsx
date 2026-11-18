import { Navigate, useSearchParams } from 'react-router';
import { AdminAuthShell } from '@/features/admin/components/AdminAuthShell';
import { ServerAdminLogin } from '@/features/admin/components/ServerAdminLogin';
import { useAdminAuthStore } from '@/stores/adminAuthStore';

/** Connexion en deux étapes (19.2) : mot de passe, code et blocage sont vérifiés par le serveur. */
export default function AdminLoginPage() {
  const admin = useAdminAuthStore((s) => s.admin);
  const [params] = useSearchParams();
  const back = params.get('retour')?.startsWith('/admin') ? params.get('retour')! : '/admin';

  if (admin) return <Navigate to={back} replace />;
  return (
    <AdminAuthShell>
      <ServerAdminLogin back={back === '/admin' ? '/admin/commandes' : back} />
    </AdminAuthShell>
  );
}
