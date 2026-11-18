import { useParams } from 'react-router';
import { ServerInvite } from '@/features/admin/components/ServerInvite';

/**
 * Invitation d'un membre de l'équipe (19.2) : il choisit son mot de passe, configure la double vérification
 * et note ses codes de secours avant tout accès au back-office.
 */
export default function AdminInvitePage() {
  const { token = '' } = useParams();
  return <ServerInvite token={token} />;
}
