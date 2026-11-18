import { Check, Minus, UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SelectField, TextField } from '@/components/ui/TextField';
import { adminNavigation, adminRoleLabel } from '@/features/admin/admin.navigation';
import { adminApi } from '@/features/admin/admin.api';
import { useAdminMutation, useAdminTeam, useCustomRoles } from '@/features/admin/admin.queries';
import { CustomRolesSection, MemberRightsDialog } from '@/features/admin/components/TeamRights';
import type { AdminRole, TeamMember } from '@/features/admin/admin.types';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { ReasonDialog } from '@/features/admin/components/ReasonDialog';
import { StateBadge } from '@/features/admin/components/StatusBadges';
import { PageIntro } from '@/features/admin/components/Toolbar';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { toast } from '@/stores/toastStore';
import { formatDate } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';
import { uid } from '@/utils/ids';

const ROLES = Object.keys(adminRoleLabel) as AdminRole[];

/** Droits de chaque rôle, tirés du menu du back-office (une seule source de vérité). */
const PERMISSIONS: Array<{ label: string; roles: AdminRole[] }> = [
  ...adminNavigation.flatMap((g) =>
    g.items.map((i) => ({ label: i.label, roles: ['super_admin' as AdminRole, ...i.roles] })),
  ),
  { label: 'Exports de données', roles: ['super_admin'] },
];

const statusBadge = (s: TeamMember['status']) =>
  s === 'active' ? (
    <StateBadge tone="forest">Actif</StateBadge>
  ) : s === 'invited' ? (
    <StateBadge tone="warning">Invitation envoyée</StateBadge>
  ) : (
    <StateBadge tone="danger">Suspendu</StateBadge>
  );

export default function AdminTeamPage() {
  const me = useAdminAuthStore((s) => s.admin);
  const { data: team, isLoading } = useAdminTeam();
  const [inviting, setInviting] = useState(false);
  const [delegating, setDelegating] = useState<TeamMember | null>(null);
  const [resetting, setResetting] = useState<TeamMember | null>(null);
  const [rights, setRights] = useState<TeamMember | null>(null);
  const { data: customRoles = [] } = useCustomRoles();
  const update = useAdminMutation(
    ({ member, patch }: { member: TeamMember; patch: Partial<TeamMember> }) =>
      adminApi.updateMember(member.id, {
        ...patch,
        // Suspension ou changement de rôle : les sessions ouvertes sont fermées immédiatement (19.2)
        ...(patch.role || patch.status === 'suspended' ? { sessionsRevokedAt: new Date().toISOString() } : {}),
      }),
    ({ member, patch }) =>
      patch.status === 'suspended'
        ? `${member.firstName} ${member.lastName} suspendu, sessions fermées`
        : patch.role
          ? `Rôle de ${member.firstName} ${member.lastName} modifié, sessions fermées`
          : 'Équipe mise à jour',
  );
  const security = useAdminMutation(
    ({ member, action, reason }: { member: TeamMember; action: 'revoke' | 'reset' | 'renew'; reason?: string }) =>
      action === 'revoke'
        ? adminApi.revokeSessions(member.id)
        : action === 'renew'
          ? adminApi.renewInvite(member.id)
          : adminApi.resetMfa(member.id, reason),
    ({ member, action, reason }) =>
      action === 'revoke'
        ? `Sessions de ${member.firstName} ${member.lastName} fermées`
        : action === 'renew'
          ? `Nouveau lien d’invitation pour ${member.firstName} ${member.lastName}`
          : `Double vérification de ${member.firstName} ${member.lastName} réinitialisée (${reason})`,
  );
  const inviteLink = (m: TeamMember) => `${window.location.origin}/admin/invitation/${m.inviteToken}`;

  if (isLoading || !team) return <PageLoader />;
  const isOwner = me?.role === 'super_admin';

  const columns: Column<TeamMember>[] = [
    {
      key: 'name',
      header: 'Membre',
      cell: (m) => (
        <span className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-forest text-xs font-bold text-white">
            {m.firstName[0]}
            {m.lastName[0]}
          </span>
          <span>
            <span className="block font-semibold">
              {m.firstName} {m.lastName}
              {m.id === me?.id && <span className="ml-1.5 text-xs font-medium text-ink-muted">(vous)</span>}
            </span>
            <span className="block text-xs text-ink-muted">{m.email}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Rôle',
      cell: (m) =>
        isOwner && m.id !== me?.id ? (
          <select
            aria-label={`Rôle de ${m.firstName}`}
            className="input h-9 w-auto py-0 text-sm"
            value={m.role}
            onChange={(e) => update.mutate({ member: m, patch: { role: e.target.value as AdminRole } })}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {adminRoleLabel[r]}
              </option>
            ))}
          </select>
        ) : (
          adminRoleLabel[m.role]
        ),
    },
    {
      key: 'rights',
      header: 'Rôles cumulés',
      cell: (m) =>
        m.role === 'super_admin' ? (
          <span className="text-ink-soft">Tous les droits</span>
        ) : (
          <span className="flex flex-col gap-1 text-sm">
            <span className={m.extraRoles?.length || m.customRoleIds?.length ? 'text-ink-soft' : 'text-ink-muted'}>
              {[
                ...(m.extraRoles ?? []).map((r) => adminRoleLabel[r]),
                ...(m.customRoleIds ?? []).map((id) => customRoles.find((r) => r.id === id)?.name ?? 'Rôle supprimé'),
              ].join(', ') || 'Aucun'}
            </span>
            {isOwner && m.id !== me?.id && (
              <button
                type="button"
                className="self-start font-semibold text-forest hover:underline"
                onClick={() => setRights(m)}
              >
                Modifier les droits
              </button>
            )}
          </span>
        ),
    },
    { key: 'status', header: 'Statut', cell: (m) => statusBadge(m.status) },
    {
      key: 'security',
      header: 'Sécurité',
      cell: (m) =>
        m.status === 'invited' ? (
          <span className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">
              {m.inviteExpiresAt && new Date(m.inviteExpiresAt).getTime() < Date.now()
                ? 'Lien expiré'
                : `Lien valable jusqu’au ${m.inviteExpiresAt ? formatDate(m.inviteExpiresAt) : '-'}`}
            </span>
            {isOwner && (
              <span className="flex flex-wrap gap-x-3">
                {m.inviteToken && (
                  <button
                    type="button"
                    className="font-semibold text-forest hover:underline"
                    onClick={() => {
                      void navigator.clipboard?.writeText(inviteLink(m));
                      toast.success('Lien d’invitation copié', {
                        description: 'Il a aussi été envoyé par e-mail.',
                      });
                    }}
                  >
                    Copier le lien
                  </button>
                )}
                <button
                  type="button"
                  className="font-semibold text-forest hover:underline"
                  onClick={() => security.mutate({ member: m, action: 'renew' })}
                >
                  Renouveler
                </button>
              </span>
            )}
          </span>
        ) : (
          <span className="flex flex-col gap-1 text-sm">
            <span className={m.backupCodesLeft ? 'text-ink-soft' : 'text-warning'}>
              Double vérification active · {m.backupCodesLeft ?? 0} code(s) de secours
            </span>
            {isOwner && m.id !== me?.id && (
              <span className="flex flex-wrap gap-x-3">
                <button
                  type="button"
                  className="font-semibold text-forest hover:underline"
                  onClick={() => security.mutate({ member: m, action: 'revoke' })}
                >
                  Fermer ses sessions
                </button>
                <button
                  type="button"
                  className="font-semibold text-forest hover:underline"
                  onClick={() => setResetting(m)}
                >
                  Réinitialiser la vérification
                </button>
              </span>
            )}
          </span>
        ),
    },
    {
      key: 'refunds',
      header: 'Remboursements',
      cell: (m) =>
        m.role === 'super_admin' ? (
          <span className="text-ink-soft">Sans plafond</span>
        ) : (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={m.refundLimit != null ? 'font-medium' : 'text-ink-muted'}>
              {m.refundLimit != null ? `Jusqu’à ${formatPrice(m.refundLimit)}` : 'Non délégués'}
            </span>
            {isOwner && (
              <button
                type="button"
                onClick={() => setDelegating(m)}
                className="text-sm font-semibold text-forest hover:underline"
              >
                Modifier
              </button>
            )}
          </span>
        ),
    },
    {
      key: 'actions',
      header: 'Accès',
      align: 'right',
      cell: (m) =>
        isOwner && m.id !== me?.id && m.status !== 'invited' ? (
          <Button
            size="sm"
            variant={m.status === 'suspended' ? 'outline' : 'danger'}
            onClick={() =>
              update.mutate({ member: m, patch: { status: m.status === 'suspended' ? 'active' : 'suspended' } })
            }
          >
            {m.status === 'suspended' ? 'Rétablir' : 'Suspendre'}
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageIntro
        actions={
          isOwner && (
            <Button icon={<UserPlus className="size-4" />} onClick={() => setInviting(true)}>
              Inviter un membre
            </Button>
          )
        }
      >
        Chaque membre n’accède qu’aux écrans de son rôle. Seul l’administrateur principal gère l’équipe, les paramètres
        et les exports.
      </PageIntro>
      <AdminTable caption="Équipe" columns={columns} rows={team} rowKey={(m) => m.id} />

      <h2 className="mt-8 mb-3 text-lg">Droits par rôle</h2>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="sr-only">Droits par rôle</caption>
          <thead>
            <tr className="border-b border-sage bg-ivory/60">
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-ink-muted">
                Écrans
              </th>
              {ROLES.map((r) => (
                <th key={r} scope="col" className="px-4 py-3 text-center text-xs font-semibold text-ink-muted">
                  {adminRoleLabel[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((p) => (
              <tr key={p.label} className="border-b border-sage/70 last:border-0">
                <th scope="row" className="px-4 py-3 text-left font-medium">
                  {p.label}
                </th>
                {ROLES.map((r) => (
                  <td key={r} className="px-4 py-3 text-center">
                    {p.roles.includes(r) ? (
                      <Check className="mx-auto size-4 text-forest" aria-label="Autorisé" />
                    ) : (
                      <Minus className="mx-auto size-4 text-ink-muted/50" aria-label="Non autorisé" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-ink-muted">
        Ce tableau décrit les droits attendus ; leur contrôle effectif doit être fait par l’API, jamais seulement dans
        le navigateur.
      </p>
      {inviting && <InviteDialog team={team} onClose={() => setInviting(false)} />}
      {delegating && <DelegationDialog member={delegating} onClose={() => setDelegating(null)} />}
      {isOwner && <CustomRolesSection roles={customRoles} team={team} />}
      {rights && <MemberRightsDialog member={rights} customRoles={customRoles} onClose={() => setRights(null)} />}
      <ReasonDialog
        open={!!resetting}
        onClose={() => setResetting(null)}
        title={`Réinitialiser la double vérification de ${resetting?.firstName ?? ''}`}
        description="Procédure de récupération : à faire seulement après vérification de l’identité de la personne. Ses codes de secours sont annulés et ses sessions fermées ; elle en génère de nouveaux à sa prochaine connexion."
        label="Comment l’identité a été vérifiée"
        confirmLabel="Réinitialiser"
        danger
        loading={security.isPending}
        onConfirm={(reason) =>
          resetting &&
          security.mutate({ member: resetting, action: 'reset', reason }, { onSuccess: () => setResetting(null) })
        }
      />
    </>
  );
}

function InviteDialog({ team, onClose }: { team: TeamMember[]; onClose: () => void }) {
  const [v, setV] = useState({ firstName: '', lastName: '', email: '', role: 'orders_manager' as AdminRole });
  const [error, setError] = useState('');
  const invite = useAdminMutation(
    (m: Omit<TeamMember, 'status'>) => adminApi.inviteMember(m),
    (m) => `Invitation envoyée à ${m.email}`,
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const email = v.email.trim().toLowerCase();
    if (!v.firstName.trim() || !v.lastName.trim()) return setError('Saisissez le prénom et le nom.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Adresse e-mail invalide.');
    if (team.some((m) => m.email === email)) return setError('Cette personne fait déjà partie de l’équipe.');
    invite.mutate(
      { id: uid(), firstName: v.firstName.trim(), lastName: v.lastName.trim(), email, role: v.role },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Inviter un membre"
      description="La personne reçoit un lien pour choisir son mot de passe (envoyé par l’API en production)."
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Prénom" value={v.firstName} onChange={(e) => setV({ ...v, firstName: e.target.value })} />
          <TextField label="Nom" value={v.lastName} onChange={(e) => setV({ ...v, lastName: e.target.value })} />
        </div>
        <TextField
          label="E-mail professionnel"
          type="email"
          value={v.email}
          onChange={(e) => setV({ ...v, email: e.target.value })}
        />
        <SelectField label="Rôle" value={v.role} onChange={(e) => setV({ ...v, role: e.target.value as AdminRole })}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {adminRoleLabel[r]}
            </option>
          ))}
        </SelectField>
        {error && (
          <p className="text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={invite.isPending}>
            Envoyer l’invitation
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Délégation des remboursements (14.5) : accordée, ajustée ou révoquée par l'administrateur principal. */
function DelegationDialog({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const [enabled, setEnabled] = useState(member.refundLimit != null);
  const [limit, setLimit] = useState(String(member.refundLimit ?? 50000));
  const [error, setError] = useState('');
  const name = `${member.firstName} ${member.lastName}`;
  const save = useAdminMutation(
    (refundLimit: number | null) => adminApi.updateMember(member.id, { refundLimit }),
    (refundLimit) =>
      refundLimit == null
        ? `Délégation des remboursements révoquée : ${name}`
        : `Remboursements délégués à ${name} jusqu’à ${formatPrice(refundLimit)}`,
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!enabled) return save.mutate(null, { onSuccess: onClose });
    const n = Number(limit);
    if (!Number.isInteger(n) || n <= 0) return setError('Saisissez un plafond en FCFA, sans décimales.');
    save.mutate(n, { onSuccess: onClose });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Remboursements : ${name}`}
      description="Au-delà du plafond, seul l’administrateur principal peut confirmer le remboursement. Chaque remboursement est inscrit au journal."
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <label className="flex items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            className="size-4 accent-forest"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Autoriser ce membre à exécuter des remboursements
        </label>
        {enabled && (
          <TextField
            label="Plafond par remboursement (FCFA)"
            inputMode="numeric"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            error={error}
          />
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={save.isPending}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
