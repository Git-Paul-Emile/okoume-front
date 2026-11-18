import { CircleCheck, Download, FileSpreadsheet, OctagonAlert } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { Category } from '@/features/categories/categories.types';
import { cn } from '@/utils/text';
import { adminApi } from '../admin.api';
import { useAdminMutation } from '../admin.queries';
import type { AdminProduct } from '../admin.types';
import {
  analyzeImport,
  buildImportedProducts,
  IMPORT_TEMPLATE,
  parseCsv,
  type ImportIssue,
  type ImportLine,
} from '../catalogImport';

const issueLabel: Record<ImportIssue, string> = {
  missing: 'Champs obligatoires manquants',
  duplicate: 'Références en doublon',
  invalid: 'Valeurs invalides',
};

/** Import CSV en deux temps : aperçu ligne par ligne, puis création des produits valides en brouillon (4.5). */
export function ImportCatalogDialog({
  products,
  categories,
  onClose,
}: {
  products: AdminProduct[];
  categories: Category[];
  onClose: () => void;
}) {
  const id = useId();
  const [fileName, setFileName] = useState('');
  const [lines, setLines] = useState<ImportLine[] | null>(null);
  const [error, setError] = useState('');
  const create = useAdminMutation(
    async (list: AdminProduct[]) => {
      for (const p of list) await adminApi.createProduct(p);
    },
    (list) =>
      `Import du catalogue : ${list.length} produit${list.length > 1 ? 's' : ''} créé${list.length > 1 ? 's' : ''} en brouillon`,
  );

  const read = async (file: File) => {
    setError('');
    setLines(null);
    if (!/\.csv$/i.test(file.name))
      return setError('Format attendu : CSV. Depuis Excel, choisissez « Enregistrer sous » puis « CSV ».');
    if (file.size > 2 * 1024 * 1024) return setError('Fichier trop lourd : 2 Mo au maximum.');
    setFileName(file.name);
    const result = analyzeImport(parseCsv(await file.text()), products, categories);
    if (result.headerError) return setError(result.headerError);
    if (!result.lines.length) return setError('Aucune ligne de produit dans le fichier.');
    setLines(result.lines);
  };

  const template = () => {
    const blob = new Blob([String.fromCharCode(0xfeff), IMPORT_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'modele-import-catalogue.csv';
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const valid = lines?.filter((l) => !l.errors.length) ?? [];
  const invalid = lines?.filter((l) => l.errors.length) ?? [];
  const toCreate = lines ? buildImportedProducts(lines, products, categories) : [];
  const counts = (Object.keys(issueLabel) as ImportIssue[]).map((k) => ({
    kind: k,
    count: invalid.filter((l) => l.errors.some((e) => e.kind === k)).length,
  }));

  return (
    <Modal
      open
      onClose={onClose}
      title="Importer des produits"
      description="Une ligne par variante ; les lignes qui ont la même référence forment un seul produit. Les produits sont créés en brouillon."
      className="max-w-3xl"
    >
      <div className="max-h-[68vh] space-y-5 overflow-y-auto pr-1">
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor={id}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md bg-forest px-5 text-[15px] font-semibold text-white hover:bg-forest-dark"
          >
            <FileSpreadsheet className="size-4" aria-hidden="true" />
            {fileName ? 'Choisir un autre fichier' : 'Choisir un fichier CSV'}
            <input
              id={id}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void read(f);
              }}
            />
          </label>
          <button
            type="button"
            onClick={template}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:underline"
          >
            <Download className="size-4" aria-hidden="true" />
            Télécharger le modèle
          </button>
          {fileName && <span className="text-sm text-ink-muted">{fileName}</span>}
        </div>
        <p className="text-sm text-ink-muted">
          Colonnes : reference, nom, categorie (identifiant ou nom), marque, accroche, option, valeur, prix, cout,
          stock, seuil, image (adresse web). Les photos peuvent aussi être ajoutées après l’import depuis chaque
          produit.
        </p>

        {error && (
          <p className="text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}

        {lines && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-sage p-4">
                <p className="flex items-center gap-2 font-semibold text-forest">
                  <CircleCheck className="size-5" aria-hidden="true" />
                  {valid.length} ligne{valid.length > 1 ? 's' : ''} valide{valid.length > 1 ? 's' : ''}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  {toCreate.length} produit{toCreate.length > 1 ? 's' : ''} à créer en brouillon
                </p>
              </div>
              <div className="rounded-lg border border-sage p-4">
                <p
                  className={cn(
                    'flex items-center gap-2 font-semibold',
                    invalid.length ? 'text-danger' : 'text-ink-muted',
                  )}
                >
                  <OctagonAlert className="size-5" aria-hidden="true" />
                  {invalid.length} ligne{invalid.length > 1 ? 's' : ''} non importable{invalid.length > 1 ? 's' : ''}
                </p>
                <ul className="mt-1 space-y-0.5 text-sm text-ink-soft">
                  {counts.map((c) => (
                    <li key={c.kind}>
                      {issueLabel[c.kind]} : {c.count}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-sage">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-sage bg-ivory/60 text-left text-xs text-ink-muted">
                    <th className="px-3 py-2 font-semibold">Ligne</th>
                    <th className="px-3 py-2 font-semibold">Produit</th>
                    <th className="px-3 py-2 font-semibold">Variante</th>
                    <th className="px-3 py-2 text-right font-semibold">Prix</th>
                    <th className="px-3 py-2 font-semibold">Résultat</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.line} className="border-b border-sage/70 align-top last:border-0">
                      <td className="px-3 py-2 tabular-nums text-ink-muted">{l.line}</td>
                      <td className="px-3 py-2">
                        <span className="block font-medium">{l.values.nom || '-'}</span>
                        <span className="block text-xs text-ink-muted">{l.values.reference}</span>
                      </td>
                      <td className="px-3 py-2">{l.values.valeur || 'Standard'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{l.values.prix}</td>
                      <td className="px-3 py-2">
                        {l.errors.length ? (
                          <ul className="space-y-0.5 text-xs font-semibold text-danger">
                            {l.errors.map((e) => (
                              <li key={e.message}>{e.message}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-xs font-semibold text-forest">Prête</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-sage pt-4">
        {invalid.length > 0 && valid.length > 0 && (
          <p className="mr-auto text-sm text-ink-muted">Les lignes en erreur ne seront pas importées.</p>
        )}
        <Button variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <Button
          disabled={!toCreate.length}
          loading={create.isPending}
          onClick={() => create.mutate(toCreate, { onSuccess: onClose })}
        >
          Importer {toCreate.length || ''} produit{toCreate.length > 1 ? 's' : ''}
        </Button>
      </div>
    </Modal>
  );
}
