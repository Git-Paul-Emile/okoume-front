import { strToU8, zipSync } from 'fflate';

/** Données d'un export, indépendantes du format (18.3). */
export interface ExportTable {
  header: string[];
  rows: Array<Array<string | number>>;
}

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export const tableOf = (header: string[], rows: ExportTable['rows']): ExportTable => ({ header, rows });

/** CSV avec séparateur « ; » (Excel en français) et valeurs entre guillemets. */
export function tableToCsv({ header, rows }: ExportTable) {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return [header, ...rows].map((r) => r.map(escape).join(';')).join('\n');
}

const xml = (v: string) =>
  v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Caractères de contrôle interdits en XML (tabulation et retours à la ligne conservés)
    .split('')
    .filter((ch) => [9, 10, 13].includes(ch.charCodeAt(0)) || ch.charCodeAt(0) >= 32)
    .join('');

/** A, B… Z, AA, AB… */
export const columnName = (index: number): string =>
  (index >= 26 ? columnName(Math.floor(index / 26) - 1) : '') + String.fromCharCode(65 + (index % 26));

/**
 * Classeur Excel (XLSX) minimal : une feuille, en-tête en gras et figé, nombres conservés comme nombres.
 * Écrit sans bibliothèque Excel : un XLSX est une archive ZIP de fichiers XML.
 */
export function tableToXlsx({ header, rows }: ExportTable, sheetName = 'Export'): Uint8Array {
  const all = [header, ...rows];
  const widths = header.map((_, c) => Math.min(60, Math.max(8, ...all.map((r) => String(r[c] ?? '').length + 2))));
  const cell = (v: string | number, r: number, c: number) => {
    const ref = `${columnName(c)}${r + 1}`;
    const style = r === 0 ? ' s="1"' : '';
    return typeof v === 'number' && Number.isFinite(v)
      ? `<c r="${ref}"${style}><v>${v}</v></c>`
      : `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xml(String(v ?? ''))}</t></is></c>`;
  };
  const sheet =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` +
    `<sheetData>${all.map((row, r) => `<row r="${r + 1}">${row.map((v, c) => cell(v, r, c)).join('')}</row>`).join('')}</sheetData>` +
    '</worksheet>';

  const files: Record<string, string> = {
    '[Content_Types].xml':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    '_rels/.rels':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xml(sheetName.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'xl/styles.xml':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0"/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>',
    'xl/worksheets/sheet1.xml': sheet,
  };
  return zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])));
}

/** Espaces fines et insécables remplacées : la police standard du PDF ne les connaît pas. */
const pdfText = (v: string | number) =>
  (typeof v === 'number' ? v.toLocaleString('fr-FR') : v).replace(/[\u202f\u00a0]/g, ' ');

/** PDF paysage avec titre, sous-titre, tableau et pagination. Bibliothèque chargée à la demande. */
export async function tableToPdf({ header, rows }: ExportTable, meta: { title: string; subtitle: string }) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(37, 53, 47);
  doc.text(pdfText(meta.title), 40, 48);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(107, 122, 115);
  doc.text(pdfText(meta.subtitle), 40, 66);
  autoTable(doc, {
    startY: 84,
    head: [header.map(pdfText)],
    body: rows.map((r) => r.map(pdfText)),
    styles: { fontSize: 8, cellPadding: 4, textColor: [37, 53, 47] },
    headStyles: { fillColor: [47, 108, 85], textColor: 255 },
    alternateRowStyles: { fillColor: [247, 242, 232] },
    margin: { left: 40, right: 40 },
    didDrawPage: () => {
      const page = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(107, 122, 115);
      doc.text(`Page ${page}`, doc.internal.pageSize.getWidth() - 80, doc.internal.pageSize.getHeight() - 20);
    },
  });
  return doc.output('blob');
}
