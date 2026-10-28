/* Gera um arquivo .xlsx (Excel) a partir de abas simples, usando o JSZip.
   Aba: { nome, cols: [{ t: 'Título', w: largura, f: 'txt'|'din'|'data'|'int'|'pct' }], rows: [[...]], total: [...] opcional } */
var Planilha = (function () {
  function x(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); }
  function col(i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function serial(d) { var p = String(d).split('-'); if (p.length !== 3) return null; return (Date.UTC(+p[0], +p[1] - 1, +p[2]) - Date.UTC(1899, 11, 30)) / 86400000; }
  // estilos: 0 normal, 1 cabeçalho, 2 dinheiro, 3 data, 4 inteiro, 5 percentual, 6 total texto, 7 total dinheiro, 8 título
  var EST = { txt: 0, din: 2, data: 3, int: 4, pct: 5 };
  function celula(ref, v, f, total) {
    if (v === null || v === undefined || v === '') return '';
    var s = total ? (f === 'din' ? 7 : 6) : (EST[f] || 0);
    if (f === 'data') { var n = serial(v); if (n !== null) return '<c r="' + ref + '" s="' + s + '"><v>' + n + '</v></c>'; }
    if ((f === 'din' || f === 'int' || f === 'pct') && typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '" s="' + s + '"><v>' + (f === 'din' ? Math.round(v * 100) / 100 : v) + '</v></c>';
    return '<c r="' + ref + '" s="' + s + '" t="inlineStr"><is><t xml:space="preserve">' + x(v) + '</t></is></c>';
  }
  function folha(a) {
    var linhas = [], r = 1, ini = 1;
    if (a.titulo) { linhas.push('<row r="1"><c r="A1" s="8" t="inlineStr"><is><t>' + x(a.titulo) + '</t></is></c></row>'); r = 3; ini = 3; }
    linhas.push('<row r="' + r + '">' + a.cols.map(function (c, i) { return '<c r="' + col(i) + r + '" s="1" t="inlineStr"><is><t>' + x(c.t) + '</t></is></c>'; }).join('') + '</row>');
    a.rows.forEach(function (l) { r++; linhas.push('<row r="' + r + '">' + l.map(function (v, i) { return celula(col(i) + r, v, (a.cols[i] || {}).f, false); }).join('') + '</row>'); });
    if (a.total) { r++; linhas.push('<row r="' + r + '">' + a.total.map(function (v, i) { return celula(col(i) + r, v, (a.cols[i] || {}).f, true); }).join('') + '</row>'); }
    var ult = col(a.cols.length - 1);
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="' + ini + '" topLeftCell="A' + (ini + 1) + '" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '<cols>' + a.cols.map(function (c, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + (c.w || 14) + '" customWidth="1"/>'; }).join('') + '</cols>' +
      '<sheetData>' + linhas.join('') + '</sheetData>' +
      (a.rows.length && a.filtro !== false ? '<autoFilter ref="A' + ini + ':' + ult + (ini + a.rows.length) + '"/>' : '') +
      '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>';
  }
  var ESTILOS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.00;[Red]-#,##0.00"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts>' +
    '<fonts count="3"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="13"/><name val="Calibri"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8EEF5"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top style="thin"><color rgb="FF8899AA"/></top><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="9">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment wrapText="1" vertical="center"/></xf>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>' +
    '<xf numFmtId="164" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>' +
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  function nomeAba(n, usados) {
    var s = String(n).replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31), b = s, i = 2;
    while (usados[s.toLowerCase()]) s = b.slice(0, 28) + ' ' + (i++);
    usados[s.toLowerCase()] = 1; return s;
  }
  async function gerar(abas) {
    var z = new JSZip(), usados = {};
    var nomes = abas.map(function (a) { return nomeAba(a.nome, usados); });
    z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      abas.map(function (a, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>');
    z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    z.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      nomes.map(function (n, i) { return '<sheet name="' + x(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets>' +
      '<definedNames>' + abas.map(function (a, i) { if (!a.rows.length || a.filtro === false) return ''; var ini = a.titulo ? 3 : 1; return '<definedName name="_xlnm._FilterDatabase" localSheetId="' + i + '" hidden="1">\'' + x(nomes[i].replace(/'/g, "''")) + '\'!$A$' + ini + ':$' + col(a.cols.length - 1) + '$' + (ini + a.rows.length) + '</definedName>'; }).join('') + '</definedNames></workbook>');
    z.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      abas.map(function (a, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') +
      '<Relationship Id="rId' + (abas.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    z.file('xl/styles.xml', ESTILOS);
    abas.forEach(function (a, i) { z.file('xl/worksheets/sheet' + (i + 1) + '.xml', folha(a)); });
    return z.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  return { gerar: gerar };
})();
