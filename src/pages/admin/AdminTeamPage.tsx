import { UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';
import { adminApi } from '@/features/admin/admin.api';
import { useAdminMutation, useAdminTeam } from '@/features/admin/admin.queries';
import type { TeamMember } from '@/features/admin/admin.types';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { ReasonDialog } from '@/features/admin/components/ReasonDialog';
import { StateBadge } from '@/features/admin/components/StatusBadges';
import { PageIntro } from '@/features/admin/components/Toolbar';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { formatDate } from '@/utils/formatDate';
import { uid } from '@/utils/ids';

const statusBadge = (status: TeamMember['status']) =>
  status === 'active' ? (
    <StateBadge tone="forest">Actif</StateBadge>
  ) : status === 'invited' ? (
    <StateBadge tone="warning">Invitation envoyée</StateBadge>
  ) : (
    <StateBadge tone="danger">Suspendu</StateBadge>
  );

export default function AdminTeamPage() {
  const me = useAdminAuthStore((state) => state.admin);
  const { data: team, isLoading } = useAdminTeam();
  const [inviting, setInviting] = useState(false);
  const [resetting, setResetting] = useState<TeamMember | null>(null);
  const update = useAdminMutation(
    ({ member, status }: { member: TeamMember; status: 'active' | 'suspended' }) =>
      adminApi.updateMember(member.id, { status }),
    ({ member, status }) => `${member.firstName} ${member.lastName} ${status === 'suspended' ? 'suspendu' : 'réactivé'}`,
  );
  const security = useAdminMutation(
    ({ member, action, reason }: { member: TeamMember; action: 'revoke' | 'reset'; reason?: string }) =>
      action === 'revoke' ? adminApi.revokeSessions(member.id) : adminApi.resetMfa(member.id, reason),
    ({ member, action, reason }) =>
      action === 'revoke'
        ? `Sessions de ${member.firstName} ${member.lastName} fermées`
        : `Double vérification de ${member.firstName} ${member.lastName} réinitialisée (${reason})`,
  );

  if (isLoading || !team) return <PageLoader />;

  const columns: Column<TeamMember>[] = [
    {
      key: 'name',
      header: 'Membre',
      cell: (member) => (
        <span className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-forest text-xs font-bold text-white">
            {member.firstName[0]}
            {member.lastName[0]}
          </span>
          <span>
            <span className="block font-semibold">
              {member.firstName} {member.lastName}
              {member.id === me?.id && <span className="ml-1.5 text-xs font-medium text-ink-muted">(vous)</span>}
            </span>
            <span className="block text-xs text-ink-muted">{member.email}</span>
          </span>
        </span>
      ),
    },
    { key: 'role', header: 'Rôle', cell: () => 'Administrateur' },
    { key: 'status', header: 'Statut', cell: (member) => statusBadge(member.status) },
    {
      key: 'security',
      header: 'Sécurité',
      cell: (member) =>
        member.status === 'invited' ? (
          <span className="text-sm text-ink-muted">
            {member.inviteExpiresAt && new Date(member.inviteExpiresAt).getTime() < Date.now()
              ? 'Invitation expirée'
              : `Invitation valable jusqu’au ${member.inviteExpiresAt ? formatDate(member.inviteExpiresAt) : '-'}`}
          </span>
        ) : (
          <span className="flex flex-col gap-1 text-sm">
            <span className={member.backupCodesLeft ? 'text-ink-soft' : 'text-warning'}>
              Double vérification active · {member.backupCodesLeft ?? 0} code(s) de secours
            </span>
            {member.id !== me?.id && member.status === 'active' && (
              <span className="flex flex-wrap gap-x-3">
                <button
                  type="button"
                  className="font-semibold text-forest hover:underline"
                  onClick={() => security.mutate({ member, action: 'revoke' })}
                >
                  Fermer ses sessions
                </button>
                <button
                  type="button"
                  className="font-semibold text-forest hover:underline"
                  onClick={() => setResetting(member)}
                >
                  Réinitialiser la vérification
                </button>
              </span>
            )}
          </span>
        ),
    },
    {
      key: 'actions',
      header: 'Accès',
      align: 'right',
      cell: (member) =>
        member.id !== me?.id && member.status !== 'invited' ? (
          <Button
            size="sm"
            variant={member.status === 'suspended' ? 'outline' : 'danger'}
            onClick={() => update.mutate({ member, status: member.status === 'suspended' ? 'active' : 'suspended' })}
          >
            {member.status === 'suspended' ? 'Réactiver' : 'Suspendre'}
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageIntro actions={<Button icon={<UserPlus className="size-4" />} onClick={() => setInviting(true)}>Inviter un administrateur</Button>}>
        Chaque membre actif de l’équipe dispose des mêmes accès au back-office. Vous pouvez suspendre un compte ou révoquer ses sessions.
      </PageIntro>
      <AdminTable caption="Équipe des administrateurs" columns={columns} rows={team} rowKey={(member) => member.id} />
      {inviting && <InviteDialog team={team} onClose={() => setInviting(false)} />}
      <ReasonDialog
        open={!!resetting}
        onClose={() => setResetting(null)}
        title={`Réinitialiser la double vérification de ${resetting?.firstName ?? ''}`}
        description="Après vérification de son identité, les codes de secours du membre sont annulés et ses sessions fermées. Il devra générer de nouveaux codes à sa prochaine connexion."
        label="Comment l’identité a-t-elle été vérifiée ?"
        confirmLabel="Réinitialiser"
        danger
        loading={security.isPending}
        onConfirm={(reason) =>
          resetting && security.mutate({ member: resetting, action: 'reset', reason }, { onSuccess: () => setResetting(null) })
        }
      />
    </>
  );
}

function InviteDialog({ team, onClose }: { team: TeamMember[]; onClose: () => void }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });
  const [error, setError] = useState('');
  const invite = useAdminMutation(
    (member: { id: string; firstName: string; lastName: string; email: string }) => adminApi.inviteMember(member),
    (member) => `Invitation envoyée à ${member.email}`,
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const email = form.email.trim().toLowerCase();
    if (!form.firstName.trim() || !form.lastName.trim()) return setError('Saisissez le prénom et le nom.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Adresse e-mail invalide.');
    if (team.some((member) => member.email.toLowerCase() === email)) return setError('Cette personne fait déjà partie de l’équipe.');
    invite.mutate(
      { id: uid(), firstName: form.firstName.trim(), lastName: form.lastName.trim(), email },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Inviter un administrateur"
      description="La personne reçoit un lien unique par e-mail pour choisir son mot de passe et activer son accès."
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Prénom" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
          <TextField label="Nom" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
        </div>
        <TextField label="E-mail professionnel" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={invite.isPending}>Envoyer l’invitation</Button>
        </div>
      </form>
    </Modal>
  );
}
