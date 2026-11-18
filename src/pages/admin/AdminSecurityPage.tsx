import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAdminMutation } from '@/features/admin/admin.queries';
import { BackupCodesList } from '@/features/admin/components/BackupCodesList';
import { PageIntro } from '@/features/admin/components/Toolbar';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { staffBackend } from '@/features/admin/staff.backend';
import { formatDateTime } from '@/utils/formatDate';

/** Sécurité du compte connecté (19.2) : double vérification, codes de secours, sessions. */
export default function AdminSecurityPage() {
  const admin = useAdminAuthStore((s) => s.admin);
  const state = useQuery({
    queryKey: ['admin', 'security', admin?.id],
    queryFn: () => staffBackend.backupCodesLeft(),
    enabled: !!admin,
  });
  const [codes, setCodes] = useState<string[] | null>(null);
  const [confirm, setConfirm] = useState<'codes' | 'sessions' | null>(null);

  const regenerate = useAdminMutation(async () => {
    // Les codes sont tirés et hachés par le serveur, remis une seule fois
    setCodes(await staffBackend.regenerateBackupCodes());
  }, 'Nouveaux codes de secours générés, les anciens ne fonctionnent plus');
  // La session en cours est reconnue par le serveur et reste ouverte
  const revokeOthers = useAdminMutation(() => staffBackend.revokeOtherSessions(), 'Autres sessions fermées');

  if (!admin || state.isLoading) return <PageLoader />;
  const left = state.data ?? 0;

  return (
    <div className="max-w-2xl space-y-6">
      <PageIntro>
        La double vérification est obligatoire pour l’équipe. Gardez des codes de secours pour ne pas perdre l’accès.
      </PageIntro>

      <section className="rounded-xl border border-sage bg-white p-5">
        <h2 className="text-lg">Double vérification</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Active : un code à usage unique est demandé à chaque connexion, après le mot de passe.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-sage bg-white p-5">
        <h2 className="text-lg">Codes de secours</h2>
        <p className={left ? 'text-sm text-ink-soft' : 'text-sm font-semibold text-warning'}>
          {left
            ? `${left} code(s) de secours encore utilisable(s).`
            : 'Aucun code de secours : générez-en avant d’en avoir besoin.'}
        </p>
        {codes ? (
          <BackupCodesList codes={codes} />
        ) : (
          <Button
            onClick={() => (left ? setConfirm('codes') : regenerate.mutate(undefined))}
            loading={regenerate.isPending}
          >
            Générer de nouveaux codes
          </Button>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-sage bg-white p-5">
        <h2 className="text-lg">Sessions</h2>
        <p className="text-sm text-ink-soft">
          Session ouverte le {admin.loginAt ? formatDateTime(admin.loginAt) : 'à la connexion'}. Fermez les autres
          sessions si vous avez utilisé un appareil partagé ou perdu un appareil.
        </p>
        <Button variant="outline" onClick={() => setConfirm('sessions')}>
          Fermer mes autres sessions
        </Button>
      </section>

      <ConfirmDialog
        open={confirm === 'codes'}
        title="Remplacer les codes de secours ?"
        description="Les codes actuels ne fonctionneront plus."
        confirmLabel="Générer"
        loading={regenerate.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() => regenerate.mutate(undefined, { onSuccess: () => setConfirm(null) })}
      />
      <ConfirmDialog
        open={confirm === 'sessions'}
        title="Fermer vos autres sessions ?"
        description="Les autres appareils connectés à votre compte seront déconnectés."
        confirmLabel="Fermer"
        loading={revokeOthers.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() => revokeOthers.mutate(undefined, { onSuccess: () => setConfirm(null) })}
      />
    </div>
  );
}
