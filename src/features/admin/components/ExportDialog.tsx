import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SelectField, TextAreaField } from '@/components/ui/TextField';
import { toast } from '@/stores/toastStore';
import { tableToCsv, tableToPdf, tableToXlsx, type ExportFormat, type ExportTable } from '../exporters';
import { getErrorMessage } from '@/api/ApiError';
import { formatDate } from '@/utils/formatDate';
import { adminTeamBackend } from '../adminTeam.backend';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  /** Nom du fichier sans extension ni date. */
  filename: string;
  count: number;
  table: () => ExportTable;
}

const FORMATS: Record<ExportFormat, { label: string; mime: string }> = {
  csv: { label: 'CSV (Excel, Google Sheets)', mime: 'text/csv;charset=utf-8' },
  xlsx: { label: 'XLSX (classeur Excel)', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  pdf: { label: 'PDF (à imprimer ou envoyer)', mime: 'application/pdf' },
};

function download(data: BlobPart, mime: string, name: string) {
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  // Libéré un peu plus tard : certains navigateurs lisent le fichier après le clic
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Export de données en CSV, XLSX ou PDF. Le cahier des charges (18.3) impose un motif pour chaque export :
 * l'export est d'abord déclaré à l'API, qui l'inscrit au journal avec l'auteur et la date. Sans cette trace,
 * aucun fichier n'est produit.
 */
export function ExportDialog({ open, onClose, title, description, filename, count, table }: Props) {
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 10) return setError('Précisez le motif en quelques mots (10 caractères minimum).');
    setBusy(true);
    const shortTitle = title.replace(/^Exporter (les |le |la )?/, '');
    try {
      await adminTeamBackend.declareExport({ title: shortTitle, format, rows: count, reason: reason.trim() });
    } catch (err) {
      setBusy(false);
      return setError(getErrorMessage(err));
    }
    try {
      const data = table();
      const name = `${filename}-${new Date().toISOString().slice(0, 10)}.${format}`;
      if (format === 'csv')
        // BOM UTF-8 pour qu'Excel affiche correctement les accents
        download(String.fromCharCode(0xfeff) + tableToCsv(data), FORMATS.csv.mime, name);
      else if (format === 'xlsx')
        download(tableToXlsx(data, title.replace(/^Exporter (les |le )?/, '')).slice().buffer, FORMATS.xlsx.mime, name);
      else
        download(
          await tableToPdf(data, {
            title: title.replace(/^Exporter /, ''),
            subtitle: `${description} Édité le ${formatDate(new Date().toISOString())}.`,
          }),
          FORMATS.pdf.mime,
          name,
        );
      toast.success('Export prêt', { description: `${count} lignes au format ${format.toUpperCase()}.` });
      setReason('');
      setError('');
      onClose();
    } catch {
      setError('L’export a échoué. Réessayez.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <SelectField label="Format" value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)}>
          {(Object.keys(FORMATS) as ExportFormat[]).map((f) => (
            <option key={f} value={f}>
              {FORMATS[f].label}
            </option>
          ))}
        </SelectField>
        <TextAreaField
          label="Motif de l’export"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex. rapprochement des paiements Mobile Money d’octobre"
          error={error}
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={busy}>
            Télécharger
          </Button>
        </div>
      </form>
    </Modal>
  );
}
