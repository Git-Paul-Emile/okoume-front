import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Checkbox, TextField } from '@/components/ui/TextField';
import { adminApi } from '../admin.api';
import { adminRoleLabel } from '../admin.navigation';
import { useAdminMutation } from '../admin.queries';
import type { AdminRole, TeamMember } from '../admin.types';
import { ACTIONS, DOMAINS, type Action, type CustomRole, type Domain, type Permission } from '../permissions';

const STANDARD: AdminRole[] = ['catalog_manager', 'orders_manager', 'stock_manager'];

/** Rôles cumulés d'un membre : rôles standards en plus du principal, et rôles personnalisés (2.4). */
export function MemberRightsDialog({
  member,
  customRoles,
  onClose,
}: {
  member: TeamMember;
  customRoles: CustomRole[];
  onClose: () => void;
}) {
  const [extra, setExtra] = useState<AdminRole[]>(member.extraRoles ?? []);
  const [custom, setCustom] = useState<string[]>(member.customRoleIds ?? []);
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const save = useAdminMutation(
    () =>
      adminApi.updateMember(member.id, {
        extraRoles: extra,
        customRoleIds: custom,
        // Droits modifiés : les sessions ouvertes sont fermées pour appliquer les nouveaux droits
        sessionsRevokedAt: new Date().toISOString(),
      }),
    `Droits de ${member.firstName} ${member.lastName} modifiés, sessions fermées`,
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={`Droits de ${member.firstName} ${member.lastName}`}
      description={`Rôle principal : ${adminRoleLabel[member.role]}. Les droits s’additionnent.`}
    >
      <div className="space-y-5">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Rôles standards en plus</legend>
          <div className="space-y-1.5">
            {STANDARD.filter((r) => r !== member.role).map((r) => (
              <Checkbox
                key={r}
                label={adminRoleLabel[r]}
                checked={extra.includes(r)}
                onChange={() => setExtra(toggle(extra, r))}
              />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Rôles personnalisés</legend>
          {customRoles.length ? (
            <div className="space-y-1.5">
              {customRoles.map((r) => (
                <Checkbox
                  key={r.id}
                  label={r.name}
                  checked={custom.includes(r.id)}
                  onChange={() => setCustom(toggle(custom, r.id))}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">Aucun rôle personnalisé pour l’instant.</p>
          )}
        </fieldset>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button loading={save.isPending} onClick={() => save.mutate(undefined, { onSuccess: onClose })}>
            Enregistrer
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Rôles personnalisés : droits choisis action par action, domaine par domaine. */
export function CustomRolesSection({ roles, team }: { roles: CustomRole[]; team: TeamMember[] }) {
  const [editing, setEditing] = useState<CustomRole | 'new' | null>(null);
  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg">Rôles personnalisés</h2>
          <p className="text-sm text-ink-soft">Pour un besoin précis : comptabilité, service client restreint…</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setEditing('new')}>
          Nouveau rôle
        </Button>
      </div>
      {roles.length === 0 ? (
        <p className="text-sm text-ink-muted">Aucun rôle personnalisé.</p>
      ) : (
        <ul className="divide-y divide-sage rounded-xl border border-sage bg-white text-sm">
          {roles.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span>
                <span className="block font-semibold">{r.name}</span>
                <span className="block text-xs text-ink-muted">
                  {r.permissions.length} droit(s) · {team.filter((m) => m.customRoleIds?.includes(r.id)).length}{' '}
                  membre(s)
                </span>
              </span>
              <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                Modifier
              </Button>
            </li>
          ))}
        </ul>
      )}
      {editing && <CustomRoleDialog role={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </section>
  );
}

function CustomRoleDialog({ role, onClose }: { role: CustomRole | null; onClose: () => void }) {
  const [name, setName] = useState(role?.name ?? '');
  const [perms, setPerms] = useState<Permission[]>(role?.permissions ?? []);
  const [error, setError] = useState('');
  const save = useAdminMutation(
    () => adminApi.saveCustomRole({ id: role?.id ?? '', name: name.trim(), permissions: perms }),
    role ? `Rôle « ${name.trim()} » modifié` : `Rôle « ${name.trim()} » créé`,
  );
  const toggle = (p: Permission) => setPerms((x) => (x.includes(p) ? x.filter((y) => y !== p) : [...x, p]));
  const submit = () => {
    if (name.trim().length < 3) return setError('Donnez un nom au rôle.');
    if (!perms.length) return setError('Choisissez au moins un droit.');
    setError('');
    save.mutate(undefined, { onSuccess: onClose });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={role ? `Modifier « ${role.name} »` : 'Nouveau rôle personnalisé'}
      className="max-w-4xl"
    >
      <div className="space-y-4">
        <TextField label="Nom du rôle" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="overflow-x-auto rounded-lg border border-sage">
          <table className="w-full text-sm">
            <caption className="sr-only">Droits par domaine et par action</caption>
            <thead>
              <tr className="border-b border-sage text-xs text-ink-muted">
                <th scope="col" className="px-3 py-2 text-left font-semibold">
                  Domaine
                </th>
                {(Object.keys(ACTIONS) as Action[]).map((a) => (
                  <th key={a} scope="col" className="px-2 py-2 font-semibold">
                    {ACTIONS[a]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(DOMAINS) as Domain[]).map((d) => (
                <tr key={d} className="border-b border-sage/70 last:border-0">
                  <th scope="row" className="px-3 py-2 text-left font-medium">
                    {DOMAINS[d]}
                  </th>
                  {(Object.keys(ACTIONS) as Action[]).map((a) => {
                    const p = `${d}:${a}` as Permission;
                    return (
                      <td key={a} className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          className="size-4 accent-forest"
                          aria-label={`${DOMAINS[d]} : ${ACTIONS[a]}`}
                          checked={perms.includes(p)}
                          onChange={() => toggle(p)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink-muted">
          « Consulter » donne accès aux écrans du domaine. Les membres qui ont ce rôle sont déconnectés pour recevoir
          les nouveaux droits.
        </p>
        {error && (
          <p className="text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button loading={save.isPending} onClick={submit}>
            Enregistrer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
