import { useState } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import { adminRoleLabel } from '@/features/admin/admin.navigation';
import { useActivityLog, useAdminTeam } from '@/features/admin/admin.queries';
import type { ActivityEntry } from '@/features/admin/admin.types';
import { matches } from '@/features/admin/admin.utils';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { PageIntro, SearchInput, Toolbar } from '@/features/admin/components/Toolbar';
import { formatDateTime } from '@/utils/formatDate';

const columns: Column<ActivityEntry>[] = [
  { key: 'at', header: 'Date', cell: (e) => <span className="whitespace-nowrap">{formatDateTime(e.at)}</span> },
  {
    key: 'actor',
    header: 'Membre',
    cell: (e) => (
      <>
        <span className="block font-semibold">{e.actorName}</span>
        <span className="block text-xs text-ink-muted">{adminRoleLabel[e.role]}</span>
      </>
    ),
  },
  { key: 'action', header: 'Action', cell: (e) => <span className="block max-w-xl">{e.action}</span> },
  { key: 'screen', header: 'Écran', cell: (e) => <span className="text-ink-soft">{e.screen}</span> },
];

/** Journal d'activité : qui a fait quoi et quand (17.7, 19.4). Lecture seule. */
export default function AdminJournalPage() {
  const { data: log, isLoading } = useActivityLog();
  const { data: team = [] } = useAdminTeam();
  const [member, setMember] = useState('');
  const [query, setQuery] = useState('');

  if (isLoading || !log) return <PageLoader />;
  const rows = log.filter((e) => (!member || e.actorId === member) && matches(query, e.action, e.screen));

  return (
    <>
      <PageIntro>
        Chaque modification faite par l’équipe est inscrite par le serveur, avec son auteur, son domaine et sa cible. Ce
        journal ne peut pas être modifié.
      </PageIntro>
      <Toolbar>
        <select
          value={member}
          onChange={(e) => setMember(e.target.value)}
          aria-label="Membre"
          className="input h-10 w-auto min-w-52"
        >
          <option value="">Toute l’équipe</option>
          {team.map((m) => (
            <option key={m.id} value={m.id}>
              {m.firstName} {m.lastName}
            </option>
          ))}
        </select>
        <SearchInput value={query} onChange={setQuery} placeholder="Action, écran" />
      </Toolbar>
      <AdminTable
        key={member + query}
        caption="Journal d’activité"
        columns={columns}
        rows={rows}
        rowKey={(e) => e.id}
        pageSize={25}
        empty="Aucune action enregistrée pour l’instant."
      />
    </>
  );
}
