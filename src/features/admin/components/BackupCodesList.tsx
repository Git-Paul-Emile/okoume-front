import { Button } from '@/components/ui/Button';
import { toast } from '@/stores/toastStore';

/** Codes de secours affichés une seule fois, à noter ou copier en lieu sûr. */
export function BackupCodesList({ codes }: { codes: string[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">
        Notez ces codes en lieu sûr : ils ne seront plus affichés. Chacun permet une connexion si vous n’avez pas accès
        au code de vérification.
      </p>
      <ul className="grid grid-cols-2 gap-2 rounded-md bg-ivory p-4 font-mono text-sm" aria-label="Codes de secours">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          void navigator.clipboard?.writeText(codes.join('\n'));
          toast.success('Codes copiés');
        }}
      >
        Copier les codes
      </Button>
    </div>
  );
}
