import { ServerEmails } from '@/features/admin/emails/ServerEmails';

/** Suivi des e-mails transactionnels (10.4) : états d'envoi, échecs durables et relance manuelle. */
export default function AdminEmailsPage() {
  return <ServerEmails />;
}
