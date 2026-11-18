import { Spinner } from '@/components/ui/Spinner';

export function PageLoader({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="grid min-h-[50vh] place-items-center text-forest">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="size-8" />
        <p className="text-sm font-medium text-ink-muted">{label}</p>
      </div>
    </div>
  );
}
