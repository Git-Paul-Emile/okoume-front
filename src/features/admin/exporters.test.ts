import { strFromU8, unzipSync } from 'fflate';
import { columnName, tableOf, tableToCsv, tableToXlsx } from './exporters';

const table = tableOf(
  ['Produit', 'Prix'],
  [
    ['Bol "artisanal" & co <ok>', 6500],
    ['Robe', 25000],
  ],
);

describe('exports', () => {
  it('CSV : point-virgule et guillemets doublés', () => {
    expect(tableToCsv(table).split('\n')[1]).toBe('"Bol ""artisanal"" & co <ok>";"6500"');
  });

  it('noms de colonnes Excel', () => {
    expect([0, 25, 26, 27, 701].map(columnName)).toEqual(['A', 'Z', 'AA', 'AB', 'ZZ']);
  });

  it('XLSX : archive valide, texte échappé, nombres conservés', () => {
    const files = unzipSync(tableToXlsx(table, 'Stock'));
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining(['[Content_Types].xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/styles.xml']),
    );
    const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
    expect(sheet).toContain('Bol &quot;artisanal&quot; &amp; co &lt;ok&gt;');
    expect(sheet).toContain('<c r="B2"><v>6500</v></c>');
    expect(sheet).toContain('<c r="A1" t="inlineStr" s="1">');
    expect(strFromU8(files['xl/workbook.xml'])).toContain('name="Stock"');
  });
});
