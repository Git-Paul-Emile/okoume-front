import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAdminMutation } from '@/features/admin/admin.queries';
import { PageIntro } from '@/features/admin/components/Toolbar';
import { staffBackend } from '@/features/admin/staff.backend';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { formatDateTime } from '@/utils/formatDate';

/** Gestion simple des sessions du compte administrateur. */
export default function AdminSecurityPage() {
  const admin = useAdminAuthStore((state) => state.admin);
  const [confirm, setConfirm] = useState(false);
  const revoke = useAdminMutation(() => staffBackend.revokeOtherSessions(), 'Autres sessions fermées');

  return (
    <div className="max-w-2xl space-y-6">
      <PageIntro>Consultez la session en cours ou fermez vos autres sessions ouvertes.</PageIntro>
      <section className="space-y-3 rounded-xl border border-sage bg-white p-5">
        <h2 className="text-lg">Sessions</h2>
        <p className="text-sm text-ink-soft">
          Session ouverte le {admin?.loginAt ? formatDateTime(admin.loginAt) : 'à la connexion'}.
        </p>
        <Button variant="outline" onClick={() => setConfirm(true)}>Fermer mes autres sessions</Button>
      </section>
      <ConfirmDialog
        open={confirm}
        title="Fermer vos autres sessions ?"
        description="Les autres appareils connectés à votre compte seront déconnectés."
        confirmLabel="Fermer"
        loading={revoke.isPending}
        onClose={() => setConfirm(false)}
        onConfirm={() => revoke.mutate(undefined, { onSuccess: () => setConfirm(false) })}
      />
    </div>
  );
}
