import { useParams } from 'react-router';
import { ServerInvite } from '@/features/admin/components/ServerInvite';

/**
 * Le membre invité choisit un mot de passe pour activer son compte.
 */
export default function AdminInvitePage() {
  const { token = '' } = useParams();
  return <ServerInvite token={token} />;
}
