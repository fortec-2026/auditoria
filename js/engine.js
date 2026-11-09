/* ===== Motor fiscal: leitura de NF-e/NFC-e, apuração e auditoria =====
   Regime: Lucro Real (PIS/COFINS não cumulativo). UF da empresa: SP.
   Corte do fim da ST (pneus e autopeças em SP): 01/10/2026 (Portaria SRE 34/2026). */
var Fiscal = (function () {
  'use strict';

  /* Monofásicos de PIS/COFINS: pneus e câmaras (Lei 10.485/2002, art. 5º) e autopeças dos Anexos I e II (art. 3º, I e II),
     conforme o texto vigente da lei no Planalto. Formato de cada linha:
                             NCM (prefixo)            -> monofásico
                             NCM ex:03,05             -> monofásico só nesses destaques Ex da TIPI
                             NCM ?                    -> depende da destinação (Anexo II ou Ex sem correspondência): o CST da nota decide */
  var DEFAULT_MONO = [
    // art. 5º: pneus e câmaras de ar
    '4011', '4013',
    // Anexo I (aplicação pelo código)
    '40161010', '40169990 ex:03,05', '6813', '70071100', '70072100', '70091000', '73201000 ex:01', '83012000', '83023000',
    '84073390', '84073490', '840820', '840991', '840999', '841330', '841391 ?', '84148021', '84148022', '841520',
    '84212300', '84213100', '84314100', '84314200', '84339090', '84818099 ex:01,02',
    '848310', '84832000', '848330', '848340', '848350', '850520', '850710', '8511', '851220', '85123000', '851240', '851290',
    '85272', '85365090 ex:01', '853910', '85443000', '870600', '8707', '8708',
    '90292010', '90299010', '90303921', '90318040', '9032892', '91040000', '94012000',
    // Anexo II (só quando próprio para as máquinas e veículos indicados em cada item)
    '4009 ?', '8431 ?', '84089090 ?', '84122110 ?', '84122190 ?', '84123110 ?', '84136019 ?', '84148019 ?', '84149039 ?',
    '84329000 ?', '84811000 ?', '84812090 ?', '84818092 ?', '8483601 ?', '85011019 ?'
  ];
  /* Pneumáticos (antigo Anexo VII, art. 310 do RICMS/SP) e autopeças (antigo Anexo XIV, art. 313-O) da Portaria CAT 68/2019,
     revogados pela Portaria SRE 34/2026, art. 1º, I: saem da ST em 01/10/2026 (estoque: Portaria CAT 28/2020).
     Relação conforme o texto oficial dos anexos (itens 1 a 127 do Anexo XIV; item 112 revogado em 2022).
     Usado só nas regras de ICMS. Itens com CEST 01 (autopeças) ou 16 (pneus) também entram. */
  var DEFAULT_ST = [
    '4011', '401290', '4013', '38151210', '38151290', '3917', '39181000', '39233000', '39263000', '40103', '59100000', '40169300',
    '4823909', '40161010', '40169990', '57050000', '59039000', '59090000', '63061', '65061000', '6813', '70071100', '70072100', '70091000',
    '70140000', '73110000', '7320', '7325', '780600', '80070090', '830120', '830160', '830170', '83021000', '83023000', '831000',
    '84073', '840820', '84099', '84122', '841330', '84141000', '8414801', '8414802', '84139190', '84149010', '8414903', '841520',
    '84212300', '84212990', '84219', '84241000', '84213100', '84213920', '84254200', '84311010', '8431492', '84339090', '84811000', '84812',
    '84818092', '8482', '8483', '8484', '850520', '850710', '8511', '851220', '851240', '85129000', '85171213', '8518',
    '851981', '8525501', '85256010', '85272100', '85272900', '85219090', '85291090', '853400', '853530', '853650', '85361000', '85362000',
    '85364', '8538', '853910', '85392', '85442000', '85443000', '8707', '8708', '87141', '87169090', '902610', '902620',
    '9029', '90303321', '90318040', '9032892', '91040000', '94012000', '94019090', '96138000', '4009', '45049000', '68129910', '48234000',
    '39191000', '39199000', '84123110', '84131900', '84135090', '84138100', '84136019', '84137010', '84145910', '84145990', '84213990', '85011019',
    '85013110', '85045000', '850720', '850730', '85123000', '9032898', '9032899', '90271000', '40081100', '56012219', '57032000', '57033000',
    '59119000', '69039099', '70072900', '73151100', '84189900', '841950', '84249090', '84254910', '84314100', '85016100', '85311090', '90141000',
    '90251990', '90259010', '902690', '90321010', '90321090', '90322000'
  ];
  /* NCMs que saíram da ST antes da data geral: vidros (Anexo XIV, item 15), revogado pela Portaria SRE 64/2025 desde 01/01/2026 */
  var CORTE_NCM = [['70071100', '2026-01-01'], ['70072100', '2026-01-01']];

  var SUL_SUDESTE_EXC_ES = ['SP', 'RJ', 'MG', 'PR', 'SC', 'RS'];
  var IMPORTADO = ['1', '2', '3', '8'];

  function r2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  function num(s) { var n = parseFloat(s); return isFinite(n) ? n : 0; }

  /* ---------- Leitura de XML ---------- */
  function first(el, tag) {
    if (!el) return null;
    var l = el.getElementsByTagName(tag);
    return l && l.length ? l[0] : null;
  }
  function txt(el, tag) { var e = first(el, tag); return e && e.textContent != null ? String(e.textContent).trim() : ''; }
  function childByName(el, name) {
    if (!el) return null;
    for (var c = el.firstChild; c; c = c.nextSibling) if (c.nodeType === 1 && (c.localName || c.nodeName) === name) return c;
    return null;
  }
  function firstElementChild(el) {
    if (!el) return null;
    for (var c = el.firstChild; c; c = c.nextSibling) if (c.nodeType === 1) return c;
    return null;
  }

  // Recebe um Document (DOMParser). Retorna {tipo:'nfe', nota} | {tipo:'evento', ...} | {tipo:'desconhecido'}
  function parseDoc(doc) {
    var root = doc.documentElement;
    if (!root) return { tipo: 'desconhecido' };
    var pedReg = first(root, 'infPedReg');
    if (pedReg) {
      var cancNfse = first(pedReg, 'e101101') || first(pedReg, 'e105102');
      return { tipo: 'evento', chave: txt(pedReg, 'chNFSe'), tpEvento: cancNfse ? '110111' : 'outro', cStat: '' };
    }
    var infEvento = first(root, 'infEvento');
    if (infEvento && !first(root, 'infNFe') && !first(root, 'infCte')) {
      return {
        tipo: 'evento',
        chave: txt(infEvento, 'chNFe') || txt(infEvento, 'chCTe'),
        tpEvento: txt(infEvento, 'tpEvento'),
        cStat: txt(first(root, 'retEvento') || root, 'cStat')
      };
    }
    if (first(root, 'infCte')) return parseCte(root);
    if (first(root, 'infNFSe')) return parseNfse(root);
    var inf = first(root, 'infNFe');
    if (!inf) return { tipo: 'desconhecido' };
    var ide = first(inf, 'ide'), emit = first(inf, 'emit'), dest = first(inf, 'dest');
    var id = inf.getAttribute('Id') || '';
    var chave = id.replace(/^NFe/, '');
    var prot = first(root, 'infProt');
    var dh = txt(ide, 'dhEmi') || txt(ide, 'dEmi');
    var ender = function (e) { return first(e, 'enderEmit') || first(e, 'enderDest'); };
    var tot = first(inf, 'ICMSTot');
    var ibsTot = first(inf, 'IBSCBSTot');

    var nota = {
      ch: chave,
      mod: txt(ide, 'mod'),
      n: txt(ide, 'nNF'),
      s: txt(ide, 'serie'),
      dt: dh.slice(0, 10),
      tp: txt(ide, 'tpNF'),
      idDest: txt(ide, 'idDest'),
      fin: txt(ide, 'finNFe'),
      nat: txt(ide, 'natOp').slice(0, 60),
      eC: txt(emit, 'CNPJ') || txt(emit, 'CPF'),
      eN: txt(emit, 'xNome').slice(0, 60),
      eUF: txt(ender(emit), 'UF'),
      dC: dest ? (txt(dest, 'CNPJ') || txt(dest, 'CPF')) : '',
      dN: dest ? txt(dest, 'xNome').slice(0, 60) : '',
      dUF: dest ? txt(ender(dest), 'UF') : '',
      dIE: dest ? txt(dest, 'indIEDest') : '',
      dIEn: dest ? txt(dest, 'IE') : '',
      indF: txt(ide, 'indFinal'),
      st: prot ? txt(prot, 'cStat') : '',
      t: {
        vNF: num(txt(tot, 'vNF')), vProd: num(txt(tot, 'vProd')), vICMS: num(txt(tot, 'vICMS')),
        vST: num(txt(tot, 'vST')), vPIS: num(txt(tot, 'vPIS')), vCOF: num(txt(tot, 'vCOFINS')),
        vIPI: num(txt(tot, 'vIPI')),
        vIBS: ibsTot ? num(txt(ibsTot, 'vIBS')) : 0,
        vCBS: ibsTot ? num(txt(ibsTot, 'vCBS')) : 0
      },
      it: []
    };
    if (nota.mod === '65' && !nota.dUF) nota.dUF = nota.eUF;
    var refs = [], refEls = inf.getElementsByTagName('refNFe');
    for (var rI = 0; rI < refEls.length; rI++) refs.push(String(refEls[rI].textContent || '').trim());
    var infAd = first(inf, 'infAdic'), compl = infAd ? (txt(infAd, 'infCpl') + ' ' + txt(infAd, 'infAdFisco')) : '';
    (compl.replace(/\s+/g, '').match(/\d{44}/g) || []).forEach(function (k) { if (refs.indexOf(k) < 0) refs.push(k); });
    nota.refs = refs;
    nota.stInf = /ICMS[\s-]*ST|SUBST|RETIDO/i.test(compl);

    var dets = inf.getElementsByTagName('det');
    var difal = false;
    for (var i = 0; i < dets.length; i++) {
      var det = dets[i];
      var prod = first(det, 'prod'), imp = first(det, 'imposto');
      var icmsWrap = first(imp, 'ICMS');
      var icms = firstElementChild(icmsWrap);
      var pis = firstElementChild(first(imp, 'PIS'));
      var cof = firstElementChild(first(imp, 'COFINS'));
      var ipi = first(imp, 'IPI'), ibscbs = first(imp, 'IBSCBS');
      var ufD = first(imp, 'ICMSUFDest');
      if (ufD) difal = true;
      var cst = icms ? (txt(icms, 'CST') || txt(icms, 'CSOSN')) : '';
      nota.it.push({
        k: num(det.getAttribute('nItem')) || (i + 1),
        cp: txt(prod, 'cProd').slice(0, 40),
        x: txt(prod, 'xProd').slice(0, 70),
        ncm: txt(prod, 'NCM'),
        cest: txt(prod, 'CEST'),
        ex: txt(prod, 'EXTIPI'),
        cf: txt(prod, 'CFOP'),
        o: icms ? txt(icms, 'orig') : '',
        cst: cst,
        bc: num(txt(icms, 'vBC')),
        p: num(txt(icms, 'pICMS')),
        v: num(txt(icms, 'vICMS')),
        vst: num(txt(icms, 'vICMSST')),
        stR: num(txt(icms, 'vICMSSTRet')),
        cSN: num(txt(icms, 'vCredICMSSN')),
        cP: pis ? txt(pis, 'CST') : '',
        vP: num(txt(pis, 'vPIS')),
        cC: cof ? txt(cof, 'CST') : '',
        vC: num(txt(cof, 'vCOFINS')),
        vIPI: ipi ? num(txt(ipi, 'vIPI')) : 0,
        cIbs: ibscbs ? txt(ibscbs, 'CST') : '', ctIbs: ibscbs ? txt(ibscbs, 'cClassTrib') : '',
        vp: num(txt(prod, 'vProd')),
        vd: num(txt(prod, 'vDesc')),
        vf: num(txt(prod, 'vFrete')) + num(txt(prod, 'vSeg')) + num(txt(prod, 'vOutro')),
        uD: ufD ? { b: num(txt(ufD, 'vBCUFDest')), p: num(txt(ufD, 'pICMSUFDest')), i: num(txt(ufD, 'pICMSInter')), f: num(txt(ufD, 'pFCPUFDest')), v: num(txt(ufD, 'vICMSUFDest')), vf: num(txt(ufD, 'vFCPUFDest')) } : null
      });
    }
    nota.dif = difal;
    return { tipo: 'nfe', nota: nota };
  }

  /* ---------- CT-e (modelo 57) ---------- */
  function parte(el) {
    if (!el) return { c: '', n: '', uf: '' };
    var end = null;
    for (var c = el.firstChild; c; c = c.nextSibling) if (c.nodeType === 1 && /^ender/.test(c.localName || c.nodeName)) end = c;
    return { c: txt(el, 'CNPJ') || txt(el, 'CPF'), n: txt(el, 'xNome').slice(0, 60), uf: end ? txt(end, 'UF') : '' };
  }
  function parseCte(root) {
    var inf = first(root, 'infCte'), ide = first(inf, 'ide');
    var ch = (inf.getAttribute('Id') || '').replace(/^CTe/, '');
    var prot = first(root, 'infProt');
    var emit = parte(childByName(inf, 'emit')), rem = parte(childByName(inf, 'rem')), exped = parte(childByName(inf, 'exped')),
      receb = parte(childByName(inf, 'receb')), dest = parte(childByName(inf, 'dest'));
    var toma = { c: '', n: '', uf: '' }, tomaCod = '';
    var t3 = first(ide, 'toma3'), t4 = first(ide, 'toma4');
    if (t4) { tomaCod = '4'; toma = parte(t4); }
    else if (t3) { tomaCod = txt(t3, 'toma'); toma = [rem, exped, receb, dest][+tomaCod] || toma; }
    var imp = childByName(inf, 'imp'), icms = firstElementChild(first(imp, 'ICMS'));
    var nome = icms ? (icms.localName || icms.nodeName) : '';
    var outra = nome === 'ICMSOutraUF';
    var ibs = first(imp, 'IBSCBS');
    var nfes = [], l = inf.getElementsByTagName('infNFe');
    for (var i = 0; i < l.length; i++) { var k = txt(l[i], 'chave'); if (k) nfes.push(k); }
    var vT = num(txt(first(inf, 'vPrest'), 'vTPrest'));
    var env = [emit.c, rem.c, exped.c, receb.c, dest.c, toma.c].filter(Boolean);
    var nota = {
      tipoDoc: 'cte', ch: ch, mod: '57', n: txt(ide, 'nCT'), s: txt(ide, 'serie'), dt: (txt(ide, 'dhEmi') || '').slice(0, 10), tp: '',
      eC: emit.c, eN: emit.n, eUF: emit.uf, dC: toma.c, dN: toma.n, dUF: toma.uf, st: prot ? txt(prot, 'cStat') : '', env: env,
      cte: { cfop: txt(ide, 'CFOP'), ufIni: txt(ide, 'UFIni'), ufFim: txt(ide, 'UFFim'), munIni: txt(ide, 'xMunIni'), munFim: txt(ide, 'xMunFim'),
        tomaCod: tomaCod, toma: toma, rem: rem, exped: exped, receb: receb, dest: dest,
        vT: vT, cst: icms ? (txt(icms, 'CST') || (outra ? '90' : '')) : '',
        bc: num(txt(icms, outra ? 'vBCOutraUF' : 'vBC')), p: num(txt(icms, outra ? 'pICMSOutraUF' : 'pICMS')), v: num(txt(icms, outra ? 'vICMSOutraUF' : 'vICMS')),
        vstRet: num(txt(icms, 'vICMSSTRet')), sn: nome === 'ICMSSN', nfes: nfes },
      t: { vNF: vT, vIBS: ibs ? num(txt(ibs, 'vIBS')) : 0, vCBS: ibs ? num(txt(ibs, 'vCBS')) : 0 },
      it: []
    };
    return { tipo: 'nfe', nota: nota };
  }

  /* ---------- NFS-e padrão nacional ---------- */
  function parseNfse(root) {
    var inf = first(root, 'infNFSe');
    var ch = (inf.getAttribute('Id') || '').replace(/^NFS/, '');
    var emit = childByName(inf, 'emit'), vals = childByName(inf, 'valores');
    var dps = first(inf, 'infDPS'), toma = first(dps, 'toma'), serv = first(dps, 'serv');
    var dv = childByName(dps, 'valores'), tMun = first(dv, 'tribMun'), tFed = first(dv, 'tribFed'), pc = first(tFed, 'piscofins');
    var ibs = childByName(inf, 'IBSCBS');
    var vServ = num(txt(dv, 'vServ'));
    var vDesc = num(txt(dv, 'vDescIncond'));
    var tomaC = toma ? (txt(toma, 'CNPJ') || txt(toma, 'CPF')) : '';
    var emitC = txt(emit, 'CNPJ') || txt(emit, 'CPF');
    var xTrib = txt(inf, 'xTribNac').replace(/^[0-9.]+ - /, '');
    var nota = {
      tipoDoc: 'nfse', ch: ch, mod: 'NFSe', n: txt(inf, 'nNFSe'), s: txt(dps, 'serie'),
      dt: txt(dps, 'dCompet') || (txt(dps, 'dhEmi') || '').slice(0, 10), tp: '',
      eC: emitC, eN: txt(emit, 'xNome').slice(0, 60), eUF: txt(first(emit, 'enderNac'), 'UF'),
      dC: tomaC, dN: toma ? txt(toma, 'xNome').slice(0, 60) : '', dUF: '', st: txt(inf, 'cStat'), env: [emitC, tomaC].filter(Boolean),
      nfse: { cTribNac: txt(serv, 'cTribNac'), xTrib: xTrib.slice(0, 90), desc: txt(serv, 'xDescServ').replace(/\\n/g, ' ').replace(/\s+/g, ' ').slice(0, 120),
        munIncid: txt(inf, 'xLocIncid'), vServ: vServ, vDesc: vDesc,
        bcISS: num(txt(vals, 'vBC')), aliqISS: num(txt(vals, 'pAliqAplic')), vISS: num(txt(vals, 'vISSQN')), tpRetISS: txt(tMun, 'tpRetISSQN'),
        cstPC: txt(pc, 'CST'), bcPC: num(txt(pc, 'vBCPisCofins')), vPis: num(txt(pc, 'vPis')), vCof: num(txt(pc, 'vCofins')), tpRetPC: txt(pc, 'tpRetPisCofins'),
        retIR: num(txt(tFed, 'vRetIRRF')), retCSLL: num(txt(tFed, 'vRetCSLL')), retCP: num(txt(tFed, 'vRetCP')) },
      t: { vNF: vServ, vIBS: ibs ? num(txt(ibs, 'vIBSTot')) : 0, vCBS: ibs ? num(txt(ibs, 'vCBS')) : 0 },
      it: []
    };
    return { tipo: 'nfe', nota: nota };
  }

  /* ---------- Classificação ---------- */
  function natureza(cfop) {
    var c = String(cfop || '');
    var d = c.charAt(0), r = c.slice(1);
    var entrada = d === '1' || d === '2' || d === '3';
    var venda = ['101', '102', '103', '104', '105', '106', '108', '109', '110', '115', '117', '118', '119', '120', '122', '123', '401', '402', '403', '404', '405', '651', '652', '653', '654', '655', '656', '667', '933'];
    var compra = ['101', '102', '111', '113', '116', '117', '118', '120', '121', '122', '126', '401', '403', '651', '652'];
    var devVenda = ['201', '202', '203', '204', '410', '411', '660', '661', '662'];
    var devCompra = ['201', '202', '208', '209', '410', '411', '413', '660', '661', '662'];
    var uso = ['407', '556', '653'];
    var ativo = ['406', '551'];
    var transf = ['151', '152', '153', '155', '156', '408', '409', '552', '557', '658', '659'];
    if (entrada) {
      if (uso.indexOf(r) >= 0) return 'uso';
      if (ativo.indexOf(r) >= 0) return 'ativo';
      if (devVenda.indexOf(r) >= 0) return 'devVenda';
      if (transf.indexOf(r) >= 0) return 'transfE';
      if (compra.indexOf(r) >= 0) return 'compra';
      return 'outrasE';
    }
    if (devCompra.indexOf(r) >= 0) return 'devCompra';
    if (transf.indexOf(r) >= 0) return 'transfS';
    if (venda.indexOf(r) >= 0) return 'venda';
    return 'outrasS';
  }

  // Regras de monofásico: retorna 'mono', 'cond' (depende da destinação) ou ''.
  function parseMono(list) {
    return (list || []).map(function (l) {
      var t = String(l).trim(); if (!t) return null;
      var pref = (t.match(/^[\d.]+/) || [''])[0].replace(/\D/g, ''); if (!pref) return null;
      var exm = t.match(/ex\s*:?\s*([\d,\s]+)/i);
      return { pref: pref, ex: exm ? exm[1].split(/[\s,]+/).filter(Boolean).map(function (x) { return ('0' + x).slice(-2); }) : null, cond: /\?|cond/i.test(t.slice(pref.length)) };
    }).filter(Boolean).sort(function (a, b) { return b.pref.length - a.pref.length; });
  }
  function makeMono(list) {
    var regras = parseMono(list);
    return function (ncm, ex) {
      var n = String(ncm || '').replace(/\D/g, '');
      for (var i = 0; i < regras.length; i++) {
        var r = regras[i];
        if (n.indexOf(r.pref) !== 0) continue;
        if (r.ex) return r.ex.indexOf(('0' + String(ex || '').replace(/\D/g, '')).slice(-2)) >= 0 && ex ? 'mono' : '';
        return r.cond ? 'cond' : 'mono';
      }
      return '';
    };
  }

  function makeMatcher(list) {
    var arr = (list || []).map(function (s) { return String(s).replace(/\D/g, ''); }).filter(Boolean);
    return function (ncm) {
      var n = String(ncm || '').replace(/\D/g, '');
      for (var i = 0; i < arr.length; i++) if (n.indexOf(arr[i]) === 0) return true;
      return false;
    };
  }

  function aliqInterestadual(origem, ufDestino) {
    if (IMPORTADO.indexOf(String(origem)) >= 0) return 4;
    if (SUL_SUDESTE_EXC_ES.indexOf(ufDestino) >= 0) return 12;
    return 7;
  }

  function chaveProduto(cnpjForn, it) { return String(cnpjForn || '') + '|' + String(it.cp || it.x || '').trim().toUpperCase() + '|' + String(it.ncm || ''); }

  /* ---------- Datas e períodos ---------- */
  function parseISO(d) { var p = d.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function iso(dt) { return dt.toISOString().slice(0, 10); }
  function mondayOf(d) {
    var dt = parseISO(d); var wd = (dt.getUTCDay() + 6) % 7; dt.setUTCDate(dt.getUTCDate() - wd); return iso(dt);
  }
  function addDays(d, n) { var dt = parseISO(d); dt.setUTCDate(dt.getUTCDate() + n); return iso(dt); }

  /* ---------- Apuração e auditoria ---------- */
  var PIS = 0.0165, COF = 0.076;

  function emptyTot() {
    return { icmsD: 0, icmsC: 0, icmsUso: 0, ciap: 0, pisD: 0, pisC: 0, cofD: 0, cofC: 0, vendas: 0, compras: 0, compOut: 0, compIns: 0,
      stE: 0, ibs: 0, cbs: 0, nS: 0, nE: 0, pisDest: 0, cofDest: 0,
      servPrest: 0, servTom: 0, servIns: 0, freteTom: 0, icmsFrete: 0, pcFrete: 0, pcServ: 0,
      issDev: 0, issRetSof: 0, issRetTom: 0, retFedSof: 0, retFedTom: 0, nSP: 0, nST: 0, nCT: 0, nCX: 0,
      rMono: 0, rZero: 0, rSTpc: 0, rSTicms: 0 };
  }
  function addTot(a, b) { for (var k in b) a[k] = (a[k] || 0) + b[k]; }

  // notas: array de notas; cfg: {cnpj, corte, mono[], segmento[], aliqInterna}
  function analisar(notas, cfg) {
    cfg = cfg || {};
    var cnpj = String(cfg.cnpj || '').replace(/\D/g, '');
    var corte = cfg.corte || '2026-10-01';
    var aliqInt = cfg.aliqInterna || 18;
    var segmento = cfg.segmento || 'autopecas', regime = cfg.regime || 'real', varejo = segmento !== 'autopecas';
    // PIS/COFINS: não cumulativo no Lucro Real, cumulativo no Presumido; no Simples vai no DAS
    var PIS = regime === 'presumido' ? 0.0065 : 0.0165, COF = regime === 'presumido' ? 0.03 : 0.076;
    var monoRegra = makeMono(cfg.mono && cfg.mono.length ? cfg.mono : DEFAULT_MONO);
    var classif = cfg.classificar || null, clsCache = {};
    function cls(it) { if (!classif) return null; var k = it.ncm + '|' + (it.cest || ''); return clsCache[k] || (clsCache[k] = classif({ ncm: it.ncm, cest: it.cest, destino: 'cf', uf: 'SP', regime: regime })); }
    // tratamento de PIS/COFINS do item: lista da empresa e, fora de autopeças, as regras gerais (monofásico, ST, alíquota zero)
    // regra condicionada segue o CST da nota (02, 04, 05 ou 06)
    function pcTrat(it) {
      var r = monoRegra(it.ncm, it.ex);
      if (r === 'mono' || (r === 'cond' && (it.cP === '02' || it.cP === '04'))) return 'mono';
      // regras gerais da lei (monofásicos, ST e alíquota zero) valem para qualquer segmento
      var c = cls(it); if (c && !c.erro && c.pc.trat !== 'normal' && (!c.pc.cond || ['02', '04', '05', '06'].indexOf(it.cP) >= 0)) return c.pc.trat;
      return 'normal';
    }
    function monoDe(it) { return pcTrat(it) !== 'normal'; }
    var NOME_PC = { mono: 'monofásico', zero: 'com alíquota zero', st: 'com ST de PIS/COFINS' };
    function ajusteRegime(T) {
      if (regime === 'presumido') { T.pisC = 0; T.cofC = 0; T.pcFrete = 0; T.pcServ = 0; }
      if (regime === 'simples') { T.pisD = 0; T.cofD = 0; T.pisC = 0; T.cofC = 0; T.icmsC = 0; T.icmsFrete = 0; T.pcFrete = 0; T.pcServ = 0; }
    }
    var CST_GRUPO = function (c) { c = String(c || ''); if (c.length === 3) return { '101': 'trib', '102': 'trib', '103': 'isento', '300': 'isento', '400': 'isento', '500': 'st', '900': 'trib', '201': 'st', '202': 'st', '203': 'st' }[c] || c; return { '00': 'trib', '20': 'red', '40': 'isento', '41': 'isento', '50': 'isento', '60': 'st', '10': 'st', '70': 'st', '30': 'st', '51': 'trib', '90': 'trib' }[c] || c; };
    function corteDe(ncm) { ncm = String(ncm || ''); for (var i = 0; i < CORTE_NCM.length; i++) if (ncm.indexOf(CORTE_NCM[i][0]) === 0 && CORTE_NCM[i][1] < corte) return CORTE_NCM[i][1]; return corte; }
    var stLista = makeMatcher(cfg.st && cfg.st.length ? cfg.st : DEFAULT_ST);
    // NCMs que vieram com CEST de autopeças (01) ou pneus (16) em qualquer nota entram no segmento
    var stAprendido = {};
    notas.forEach(function (n) { (n.it || []).forEach(function (i) { if (/^(01|16)/.test(String(i.cest || '').replace(/\D/g, ''))) stAprendido[String(i.ncm)] = 1; }); });
    function isSeg(ncm, cest) { if (varejo) return false; return /^(01|16)/.test(String(cest || '').replace(/\D/g, '')) || stLista(ncm) || !!stAprendido[String(ncm)]; }
    var condAvisado = {};
    var CFOP_ST = /^[56]40[1-5]$/;
    // notas de entrada com mesmo fornecedor, data e itens (código + valor) = possível duplicidade
    var assinaturas = {};
    function assinatura(n) { return n.eC + '|' + n.dt + '|' + (n.it || []).map(function (i) { return i.cp + ':' + r2(i.vp - i.vd); }).sort().join(','); }
    notas.forEach(function (n) {
      if (n.tipoDoc || n.dC !== cnpj || n.eC === cnpj || (cfg.canceladas || {})[n.ch] || ['101', '135', '151', '155'].indexOf(n.st) >= 0) return;
      var k = assinatura(n); (assinaturas[k] = assinaturas[k] || []).push(n);
    });
    var cancel = cfg.canceladas || {};
    var prodCad = cfg.produtos || {};          // { 'cnpjFornecedor|codigo': 'revenda'|'uso'|'ativo' }
    var ncmCad = cfg.ncmClasse || {};          // { '48025610': 'uso', ... } (prefixo de NCM)
    var ncmKeys = Object.keys(ncmCad).sort(function (a, b) { return b.length - a.length; });
    function classeNcm(ncm) { for (var i = 0; i < ncmKeys.length; i++) if (String(ncm).indexOf(ncmKeys[i]) === 0) return ncmCad[ncmKeys[i]]; return null; }

    // compras por fornecedor, para achar a nota original de uma devolução
    var comprasForn = {};
    notas.forEach(function (n) { if (n.tipoDoc || n.dC !== cnpj || n.eC === cnpj) return; (comprasForn[n.eC] = comprasForn[n.eC] || []).push(n); });
    Object.keys(comprasForn).forEach(function (k) { comprasForn[k].sort(function (a, b) { return a.dt < b.dt ? 1 : -1; }); });
    var ST_CST = ['10', '30', '60', '70', '201', '202', '203', '500'];
    function originalDe(nt, it) {
      var cands = [];
      (nt.refs || []).forEach(function (k) { var o = porChave[k]; if (o && o.eC !== cnpj) cands.push(o); });
      if (!cands.length) cands = (comprasForn[nt.dC] || []).filter(function (o) { return o.dt <= nt.dt; });
      // devolução de compra com ST (x411): procura primeiro uma compra que tenha vindo com ST
      if (/411$/.test(it.cf)) {
        for (var j = 0; j < cands.length; j++) {
          var st = cands[j].it.filter(function (x) { return x.ncm === it.ncm && (ST_CST.indexOf(x.cst) >= 0 || x.vst > 0 || /^[56]40[1-5]$/.test(x.cf)); })[0];
          if (st) return { nota: cands[j], it: st, porRef: (nt.refs || []).indexOf(cands[j].ch) >= 0 };
        }
      }
      for (var i = 0; i < cands.length; i++) {
        var its = cands[i].it.filter(function (x) { return x.ncm === it.ncm; });
        if (its.length) {
          var mesmo = its.filter(function (x) { return x.cp && x.cp === it.cp; })[0] || its[0];
          return { nota: cands[i], it: mesmo, porRef: (nt.refs || []).indexOf(cands[i].ch) >= 0 };
        }
      }
      return null;
    }
    function auditarDevolucao(nt, it, receita, issue) {
      if (nt.refs && !nt.refs.length && /^[56](202|411)$/.test(it.cf) && !auditarDevolucao['sr' + nt.ch]) {
        auditarDevolucao['sr' + nt.ch] = 1;
        issue('alerta', null, 'DEV_SEM_REF', 'Nota de devolução sem a NF-e original referenciada (grupo NFref). A devolução deve indicar a chave da nota de compra.', 0);
      }
      var o = originalDe(nt, it);
      if (!o) { issue('info', it, 'DEV_SEM_ORIG', 'Devolução ou remessa em garantia ao fornecedor: a nota de compra original não está entre as importadas, então não foi possível conferir se o CST e o ICMS reproduzem a operação original (RICMS/SP, art. 4º, IV).', 0); return; }
      var oi = o.it, ref = 'nota de compra nº ' + o.nota.n + ' de ' + o.nota.dt.split('-').reverse().join('/') + (o.porRef ? '' : ' (localizada pelo fornecedor e NCM)');
      var origST = ST_CST.indexOf(oi.cst) >= 0 || oi.vst > 0 || oi.stR > 0 || /^[56]40[1-5]$/.test(oi.cf);
      var devST = ST_CST.indexOf(it.cst) >= 0;
      var lei = 'RICMS/SP, art. 4º, IV; RC 26.649/2022';
      if (origST) {
        var faltaProprio = oi.v > 0 && !(it.v > 0), espST = faltaProprio ? receita * oi.p / 100 : 0;
        if (!devST || faltaProprio)
          issue('alerta', it, 'DEV_ST', 'A ' + ref + ' veio com ICMS-ST (CST ' + (oi.cst || '–') + ', CFOP ' + oi.cf + (oi.v > 0 ? ', ICMS próprio de ' + oi.p + '%' : '') + (oi.vst > 0 ? ' e ST retido de ' + money(oi.vst) : '') + '), e a devolução saiu com CST ' + (it.cst || '–') + (it.v > 0 ? '' : ' sem ICMS') + '. A devolução deve reproduzir a nota original: ' + (oi.v > 0 ? 'destacar o ICMS próprio com a mesma base e alíquota, ' : '') + 'usar CST de substituição tributária e informar a base e o valor do ICMS-ST nas informações complementares, somando o ST ao total da nota (RICMS/SP, art. 4º, IV, e art. 127, § 5º; RC 33.446/2026).', espST, faltaProprio ? { c: { icmsD: espST } } : null);
        else if (oi.vst > 0 && nt.stInf === false)
          issue('info', it, 'DEV_ST_INF', 'Devolução de mercadoria recebida com ICMS-ST retido (' + money(oi.vst) + ' na ' + ref + '): confira se a base e o valor do ICMS-ST estão nas informações complementares e no total da nota (RICMS/SP, art. 127, § 5º; RC 33.446/2026).', 0);
        return;
      }
      if (oi.v > 0 && !(it.v > 0)) {
        var esp = receita * oi.p / 100;
        issue(o.porRef ? 'erro' : 'alerta', it, 'DEV_SEM_ICMS', 'A ' + ref + ' destacou ICMS de ' + oi.p + '% (CST ' + (oi.o || '') + oi.cst + '), mas a devolução saiu com CST ' + (it.cst || '–') + ' sem ICMS. A devolução deve reproduzir a base de cálculo, a alíquota e o imposto da nota original (' + lei + ').' + (/411$/.test(it.cf) ? ' O CFOP ' + it.cf + ' é de devolução de compra com ST: se a compra original foi com ST, confira se a nota localizada é mesmo a original.' : ''), esp, { c: { icmsD: esp } });
      } else if (oi.v > 0 && it.v > 0 && Math.abs(it.p - oi.p) > 0.01) {
        issue('alerta', it, 'DEV_ALIQ', 'Alíquota de ' + it.p + '% na devolução e de ' + oi.p + '% na ' + ref + '. A devolução deve usar a mesma alíquota da operação original (' + lei + ').', Math.abs(it.bc * (oi.p - it.p) / 100), { c: { icmsD: it.bc * (oi.p - it.p) / 100 } });
      }
      if (devST) {
        issue('alerta', it, 'DEV_ST_INDEVIDO', 'A devolução saiu com CST ' + it.cst + ' (substituição tributária), mas a ' + ref + ' foi tributada normalmente (CST ' + (oi.cst || '–') + '). A devolução deve reproduzir a tributação original (' + lei + ').', 0);
      } else if (!origST && !(oi.v > 0) && it.v > 0) {
        issue('alerta', it, 'DEV_ICMS_A_MAIS', 'A devolução destacou ICMS de ' + money(it.v) + ', mas a ' + ref + ' não teve ICMS destacado (CST ' + (oi.cst || '–') + '). Confira: a devolução deve reproduzir a operação original (' + lei + ').', it.v, { c: { icmsD: -it.v } });
      }
    }

    /* Remessas sem venda: tratamento esperado pelo CFOP (RICMS/SP, versão vigente) */
    var REM = {
      '901': { t: 'sem', f: 'suspensão', cst: '50', l: 'RICMS/SP, art. 402', d: 'Remessa para industrialização' },
      '902': { t: 'sem', f: 'suspensão', cst: '50', l: 'RICMS/SP, art. 402, § 1º', d: 'Retorno de mercadoria recebida para industrialização' },
      '905': { t: 'sem', f: 'não incidência', cst: '41', l: 'RICMS/SP, art. 7º, I e II', d: 'Remessa para depósito fechado ou armazém geral', so5: 1 },
      '906': { t: 'sem', f: 'não incidência', cst: '41', l: 'RICMS/SP, art. 7º, III', d: 'Retorno de depósito fechado ou armazém geral', so5: 1 },
      '907': { t: 'sem', f: 'não incidência', cst: '41', l: 'RICMS/SP, art. 7º, III', d: 'Retorno simbólico de depósito ou armazém', so5: 1 },
      '908': { t: 'sem', f: 'não incidência', cst: '41', l: 'Súmula 573 do STF', d: 'Remessa de bem por conta de contrato de comodato' },
      '909': { t: 'sem', f: 'não incidência', cst: '41', l: 'Súmula 573 do STF', d: 'Retorno de bem recebido em comodato' },
      '910': { t: 'trib', l: 'RICMS/SP, art. 37, § 1º, item 1 (bonificação); doação e brinde são tributados salvo isenção específica', d: 'Bonificação, doação ou brinde' },
      '911': { t: 'amostra', f: 'isenção', cst: '40', l: 'RICMS/SP, Anexo I, art. 3º', d: 'Amostra grátis' },
      '912': { t: 'sem', f: 'suspensão', cst: '50', l: 'RICMS/SP, art. 319; Portaria SRE 56/2022', d: 'Remessa para demonstração ou mostruário', prazo: 60 },
      '913': { t: 'sem', f: 'suspensão', cst: '50', l: 'RICMS/SP, art. 319; Portaria SRE 56/2022', d: 'Retorno de demonstração ou mostruário' },
      '914': { t: 'sem', f: 'isenção', cst: '40', l: 'RICMS/SP, Anexo I, art. 33 (vigente até 31/12/2026)', d: 'Remessa para exposição ou feira', prazo: 60 },
      '915': { t: 'sem', f: 'não incidência', cst: '41', l: 'RICMS/SP, art. 7º, IX', d: 'Remessa para conserto ou reparo' },
      '916': { t: 'sem', f: 'não incidência', cst: '41', l: 'RICMS/SP, art. 7º, X', d: 'Retorno de conserto ou reparo' },
      '917': { t: 'trib', l: 'Ajuste SINIEF 2/1993 (consignação mercantil)', d: 'Remessa em consignação mercantil' },
      '920': { t: 'sem', f: 'isenção', cst: '40', l: 'RICMS/SP, Anexo I, art. 82', d: 'Remessa de vasilhame ou sacaria' },
      '921': { t: 'sem', f: 'isenção', cst: '40', l: 'RICMS/SP, Anexo I, art. 82, II', d: 'Devolução de vasilhame ou sacaria' },
      '151': { t: 'transf', so6: 1, d: 'Transferência de produção' },
      '152': { t: 'transf', so6: 1, d: 'Transferência de mercadoria' },
      '155': { t: 'transf', so6: 1, d: 'Transferência de produção (ST)' },
      '156': { t: 'transf', so6: 1, d: 'Transferência de mercadoria (ST)' }
    };
    function regraRemessa(cf) {
      var r = REM[String(cf).slice(1)]; if (!r || !/^[56]/.test(cf)) return null;
      if (r.so5 && cf.charAt(0) !== '5') return null;
      if (r.so6 && cf.charAt(0) !== '6') return null;
      return r;
    }
    // retornos de demonstração e exposição recebidos (para conferir o prazo de 60 dias)
    var retornos = [], dtMax = '';
    notas.forEach(function (n) {
      if (n.tipoDoc) return; if (n.dt > dtMax) dtMax = n.dt;
      var entrada = (n.eC === cnpj && n.tp === '0') || (n.dC === cnpj && n.eC !== cnpj);
      if (!entrada) return;
      var parteC = n.eC === cnpj ? n.dC : n.eC;
      (n.it || []).forEach(function (i) { if (/(913|914)$/.test(i.cf)) retornos.push({ c: parteC, ncm: i.ncm, cp: i.cp, dt: n.dt, refs: n.refs || [] }); });
    });
    function diasEntre(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); }
    var CST_SEM = ['40', '41', '50', '51', '90'], CSOSN_SEM = ['102', '103', '300', '400', '900'];
    function auditarRemessa(nt, it, r, receita, issue) {
      var simples = regime === 'simples', cf = it.cf, cfF = cf.charAt(0) + '.' + cf.slice(1);
      var interna = nt.idDest === '1' || (nt.eUF && nt.eUF === nt.dUF);
      var stItem = ['10', '30', '60', '70', '201', '202', '203', '500'].indexOf(it.cst) >= 0;
      /* PIS/COFINS: remessa não é receita */
      if (regime !== 'simples' && (it.vP > 0 || it.vC > 0)) {
        issue('alerta', it, 'REM_PC', r.d + ' (CFOP ' + cfF + ') com PIS/COFINS destacado (' + money(it.vP + it.vC) + '). Remessa sem venda não gera receita: em regra não há PIS/COFINS, e o CST adequado é 49 (outras operações de saída). Confira o cadastro da natureza de operação no emissor.', it.vP + it.vC);
      }
      if (r.t === 'sem') {
        if (it.v > 0) {
          issue('alerta', it, 'REM_ICMS', r.d + ' (CFOP ' + cfF + ') com ICMS destacado de ' + money(it.v) + '. Essa operação tem ' + r.f + ' do ICMS (' + r.l + '): a nota sai sem destaque, com ' + (simples ? 'CSOSN 400' : 'CST ' + r.cst) + '. Se o imposto foi destacado por engano, avalie a correção com o destinatário (o crédito dele também cai).', it.v, simples ? null : { c: { icmsD: -it.v } });
        } else if (!simples && ['00', '20'].indexOf(it.cst) >= 0) {
          issue('info', it, 'REM_CST', r.d + ' (CFOP ' + cfF + ') sem ICMS, mas com CST ' + it.cst + ' (tributado). O CST que descreve a operação é ' + r.cst + ' (' + r.f + '; ' + r.l + '). Não muda o imposto; corrija o cadastro da natureza de operação.', 0);
        }
        if (r.prazo) {
          var dias = diasEntre(nt.dt, dtMax);
          var volta = retornos.some(function (x) { return x.dt >= nt.dt && (x.refs.indexOf(nt.ch) >= 0 || (x.c === nt.dC && x.ncm === it.ncm)); });
          if (!volta && dias > r.prazo) {
            var aliqE = interna ? aliqInt : aliqInterestadual(it.o, nt.dUF);
            issue('alerta', it, 'REM_PRAZO', r.d + ' de ' + nt.dt.split('-').reverse().join('/') + ' sem retorno nas notas importadas depois de ' + dias + ' dias (prazo de ' + r.prazo + ' dias; ' + r.l + (cf.slice(1) === '912' ? '; mostruário e treinamento: 180 dias' : '') + '). Se a mercadoria não voltou ou foi vendida, a ' + r.f + ' deixa de valer e o ICMS é devido desde a saída, com acréscimos: emita a nota de venda ou recolha o imposto.', receita * aliqE / 100);
          }
        }
        return;
      }
      if (r.t === 'amostra') {
        if (it.v > 0) issue('info', it, 'REM_AMOSTRA', 'Amostra grátis com ICMS destacado de ' + money(it.v) + '. Há isenção (RICMS/SP, Anexo I, art. 3º) quando a amostra tem valor diminuto, traz "Amostra Grátis" e não passa de 20% da menor embalagem de venda. Se atende às condições, a nota sai com CST 40 e sem ICMS; se não atende, a tributação está correta.', 0);
        return;
      }
      if (r.t === 'trib') {
        var stAinda = stItem && !(nt.dt >= corteDe(it.ncm) && interna && isSeg(it.ncm, it.cest));
        if (simples || stAinda || it.v > 0) {
          if (!simples && it.v > 0 && !interna && nt.mod === '55') {
            var espI = aliqInterestadual(it.o, nt.dUF);
            if (it.p !== espI) issue('erro', it, 'ALIQ_INTER', 'Alíquota interestadual de ' + it.p + '% para ' + nt.dUF + ' (origem ' + it.o + ') em ' + r.d.toLowerCase() + ': esperado ' + espI + '%.', Math.abs(it.bc * (it.p - espI) / 100), { c: { icmsD: it.bc * (espI - it.p) / 100 } });
          }
          return;
        }
        var carga = interna ? aliqInt : aliqInterestadual(it.o, nt.dUF), fund = '';
        if (interna && varejo && classif) {
          var cI = cls(it);
          if (cI && !cI.erro) {
            if (cI.st.st === 'sim' || cI.icms.cst === '40' || cI.icms.cst === '60' || cI.icms.cond) return;
            carga = cI.icms.carga; fund = cI.icms.regra ? ' (' + cI.icms.regra.l + ')' : '';
          }
        }
        if (!carga) return;
        var espV = (it.vp - it.vd + it.vf) * carga / 100;
        issue('alerta', it, 'REM_TRIB', r.d + ' (CFOP ' + cfF + ') saiu com CST ' + (it.cst || '–') + ' sem ICMS próprio. Essa remessa é tributada normalmente (' + r.l + (stItem ? '; o produto saiu da ST em 01/10/2026' : '') + '): o esperado é destacar ' + carga + '%' + fund + ' sobre o valor da mercadoria, salvo isenção específica do produto.', espV, { c: { icmsD: espV } });
        return;
      }
      if (r.t === 'transf') {
        if (simples) return;
        var espT = aliqInterestadual(it.o, nt.dUF);
        if (!(it.v > 0) && !stItem) {
          issue('alerta', it, 'REM_TRANSF', 'Transferência interestadual (CFOP ' + cfF + ') sem ICMS. Desde 2024 a transferência entre estabelecimentos do mesmo titular não tem incidência (STF, ADC 49; LC 204/2023), mas a transferência do crédito ao destino é obrigatória: ou se destaca o imposto como operação tributada (LC 87/1996, art. 12, § 5º, com a indicação nas informações complementares), ou se informa o crédito transferido, limitado à alíquota interestadual de ' + espT + '% (art. 12, § 4º; Convênio ICMS 109/2024; RC SEFAZ/SP 33.994/2026).', 0);
        } else if (it.v > 0 && it.p !== espT) {
          issue('alerta', it, 'REM_TRANSF', 'Transferência interestadual (CFOP ' + cfF + ') com ' + it.p + '%: o crédito transferido ou o imposto destacado deve usar a alíquota interestadual de ' + espT + '% (LC 87/1996, art. 12, §§ 4º e 5º; Convênio ICMS 109/2024).', Math.abs(it.bc * (it.p - espT) / 100), { c: { icmsD: it.bc * (espT - it.p) / 100 } });
        }
      }
    }

    var res = { notas: [], pend: [], dias: {}, ignoradas: 0, canceladas: 0, mono: { vendas: 0, compras: 0 }, produtos: {}, servicos: {}, fretes: [] };
    var seen = {};
    var porChave = {}; notas.forEach(function (n) { if (!n.tipoDoc) porChave[n.ch] = n; });

    function fechar(nt, dir, proprio, interna, parte, T, issues, extra) {
      ajusteRegime(T);
      for (var k in T) T[k] = r2(T[k]);
      var resumo = { info: (extra && extra.info) || '', tipo: nt.tipoDoc || 'nfe', ch: nt.ch, n: nt.n, s: nt.s, mod: nt.mod, dt: nt.dt, dir: dir, proprio: proprio, interna: interna,
        parte: parte, vNF: nt.t.vNF, T: T, nIss: issues.length, extra: extra || null,
        pior: issues.reduce(function (a, i) { return i.sev === 'erro' ? 'erro' : (a === 'erro' ? a : (i.sev === 'alerta' ? 'alerta' : a || 'info')); }, '') };
      res.notas.push(resumo);
      Array.prototype.push.apply(res.pend, issues);
      if (!res.dias[nt.dt]) res.dias[nt.dt] = emptyTot();
      addTot(res.dias[nt.dt], T);
      return resumo;
    }
    function novoIssue(nt, quem, parteNome, issues) {
      return function (sev, codigo, msg, impacto, aj) {
        issues.push({ sev: sev, quem: quem, cod: codigo, msg: msg, ch: nt.ch, n: nt.n, dt: nt.dt, parte: parteNome, item: null, x: '', ncm: '', imp: r2(impacto || 0), doc: nt.tipoDoc, aj: aj || null });
      };
    }

    function analisarCte(nt) {
      var c = nt.cte, T = emptyTot(), issues = [];
      var papel = c.rem.c === cnpj ? 'remetente' : c.dest.c === cnpj ? 'destinatária' : c.exped.c === cnpj ? 'expedidora' : c.receb.c === cnpj ? 'recebedora' : nt.eC === cnpj ? 'transportadora' : '';
      var tomadora = c.toma.c === cnpj;
      var interna = c.ufIni === c.ufFim;
      var p = { c: nt.eC, n: nt.eN, uf: nt.eUF };
      var issue = novoIssue(nt, 'fornecedor', nt.eN, issues);
      var credICMS = 0, credPC = 0, dir;
      if (nt.eC === cnpj) {
        // a própria empresa prestou o transporte
        dir = 'S'; T.nSP = 1; T.servPrest += c.vT; T.icmsD += c.v;
        var bD = Math.max(0, c.vT - c.v); T.pisD += bD * PIS; T.cofD += bD * COF;
      } else if (tomadora) {
        dir = 'E'; T.nCT = 1; T.freteTom += c.vT;
        if (!c.sn && ['00', '20', '90'].indexOf(c.cst) >= 0 && c.v > 0) { credICMS = c.v; T.icmsC += c.v; T.icmsFrete += c.v; }
        var base = Math.max(0, c.vT - c.v), credita = true;
        if (papel === 'destinatária') {
          var lig = c.nfes.map(function (k) { return porChave[k]; }).filter(Boolean);
          if (lig.length && lig.every(function (n) { return n.it.length && n.it.every(function (i) { return monoDe(i); }); })) {
            credita = false;
            issue('info', 'CTE_MONO', 'Frete da compra de produtos monofásicos: o frete acompanha o custo da mercadoria e não gera crédito de PIS/COFINS.', 0);
          } else if (!lig.length) {
            issue('info', 'CTE_SEM_NF', 'Frete de compra sem a nota da mercadoria no período. O crédito de PIS/COFINS foi considerado; confira se a mercadoria não é monofásica.', 0);
          }
        }
        if (credita) { credPC = base * (PIS + COF); T.pisC += base * PIS; T.cofC += base * COF; T.pcFrete += base * (PIS + COF); }
        T.ibs += nt.t.vIBS; T.cbs += nt.t.vCBS;
        // auditoria do CT-e
        var credCte = credICMS > 0;
        if (c.bc > 0 && c.p > 0 && Math.abs(r2(c.bc * c.p / 100) - c.v) > 0.05)
          issue('erro', 'CTE_CALC', 'ICMS do CT-e (' + money(c.v) + ') não confere com base × alíquota (' + money(r2(c.bc * c.p / 100)) + ').', Math.abs(r2(c.bc * c.p / 100) - c.v), credCte ? { c: { icmsC: r2(c.bc * c.p / 100) - c.v } } : null);
        if (!interna && c.p > 0) {
          var esp = (SUL_SUDESTE_EXC_ES.indexOf(c.ufIni) >= 0 && SUL_SUDESTE_EXC_ES.indexOf(c.ufFim) < 0) ? 7 : 12;
          if (c.p !== esp) issue('erro', 'CTE_ALIQ', 'Alíquota de ' + c.p + '% no frete de ' + c.ufIni + ' para ' + c.ufFim + ': esperado ' + esp + '%.', Math.abs(c.bc * (c.p - esp) / 100), credCte ? { c: { icmsC: c.bc * (esp - c.p) / 100 } } : null);
        }
        if (interna && c.ufIni === 'SP' && c.p > 0 && c.p !== 12)
          issue('alerta', 'CTE_SP', 'Frete interno em SP com alíquota de ' + c.p + '% (prestação interna de transporte em SP: 12%). Conferir.', Math.abs(c.bc * (c.p - 12) / 100), credCte ? { c: { icmsC: c.bc * (12 - c.p) / 100 } } : null);
        if (c.cst === '60') issue('info', 'CTE_ST', 'CT-e com ICMS retido por substituição tributária (CST 60): o tomador responde pelo recolhimento.', c.vstRet);
      } else {
        dir = 'X'; T.nCX = 1;
      }
      var infoC = tomadora ? 'frete tomado: crédito de ICMS ' + money(credICMS) + ' · PIS/COFINS ' + money(r2(credPC)) : dir === 'S' ? 'transporte prestado' : 'frete pago por ' + (c.toma.n || c.toma.c) + ': sem crédito';
      var r = fechar(nt, dir, false, interna, p, T, issues, { papel: papel, tomadora: tomadora, toma: c.toma.n || c.toma.c, info: infoC });
      res.fretes.push({ ch: nt.ch, n: nt.n, dt: nt.dt, transp: nt.eN, papel: papel, tomadora: tomadora, toma: c.toma.n || c.toma.c,
        rota: c.ufIni + ' → ' + c.ufFim, v: c.vT, credICMS: r2(credICMS), credPC: r2(credPC), nIss: issues.length, pior: r.pior });
    }

    function analisarNfse(nt) {
      var s = nt.nfse, T = emptyTot(), issues = [];
      var prestada = nt.eC === cnpj, tomada = nt.dC === cnpj;
      if (!prestada && !tomada) { res.ignoradas++; return; }
      var liq = Math.max(0, s.vServ - s.vDesc);
      var retFed = s.retIR + s.retCSLL + s.retCP + (s.tpRetPC === '1' ? s.vPis + s.vCof : 0);
      var p, issue, dir;
      if (prestada) {
        dir = 'S'; T.nSP = 1; p = { c: nt.dC, n: nt.dN, uf: '' };
        issue = novoIssue(nt, 'cliente', nt.dN || 'Consumidor', issues);
        T.servPrest += liq;
        var base = s.bcPC > 0 ? s.bcPC : liq;
        T.pisD += base * PIS; T.cofD += base * COF; T.pisDest += s.vPis; T.cofDest += s.vCof;
        if (s.tpRetISS === '1' || !s.tpRetISS) T.issDev += s.vISS; else T.issRetSof += s.vISS;
        T.retFedSof += retFed;
        if (s.aliqISS > 0 && (s.aliqISS < 2 || s.aliqISS > 5))
          issue('alerta', 'ISS_ALIQ', 'Alíquota de ISS de ' + s.aliqISS + '%: a LC 116/2003 fixa o mínimo de 2% e o máximo de 5%.', 0);
        if (s.bcISS > 0 && s.aliqISS > 0 && Math.abs(r2(s.bcISS * s.aliqISS / 100) - s.vISS) > 0.05)
          issue('erro', 'ISS_CALC', 'ISS (' + money(s.vISS) + ') não confere com base × alíquota (' + money(r2(s.bcISS * s.aliqISS / 100)) + ').', Math.abs(r2(s.bcISS * s.aliqISS / 100) - s.vISS));
        if (['04', '05', '06', '07', '08', '09'].indexOf(s.cstPC) >= 0)
          issue('alerta', 'NFSE_CST', 'CST ' + s.cstPC + ' de PIS/COFINS em serviço prestado. No Lucro Real a receita de serviço é tributada (CST 01).', base * (PIS + COF), { a: { pisD: -base * PIS, cofD: -base * COF } });
        else if ((s.vPis > 0 || s.vCof > 0) && (Math.abs(s.vPis - base * PIS) > 0.05 || Math.abs(s.vCof - base * COF) > 0.05))
          issue('alerta', 'NFSE_PIS', 'PIS/COFINS destacado (' + money(s.vPis) + ' e ' + money(s.vCof) + ') difere de 1,65% e 7,6% da base (' + money(r2(base * PIS)) + ' e ' + money(r2(base * COF)) + ').', Math.abs(s.vPis + s.vCof - base * (PIS + COF)), { a: { pisD: s.vPis - base * PIS, cofD: s.vCof - base * COF } });
      } else {
        dir = 'E'; T.nST = 1; p = { c: nt.eC, n: nt.eN, uf: nt.eUF };
        issue = novoIssue(nt, 'fornecedor', nt.eN, issues);
        T.servTom += liq;
        var key = 'SERV|' + nt.eC + '|' + s.cTribNac;
        var classe = prodCad[key] || null;
        var sv = res.servicos[key] || (res.servicos[key] = { k: key, cod: s.cTribNac, x: s.xTrib || s.desc, desc: s.desc, fc: nt.eC, fn: nt.eN, n: 0, v: 0, ult: '', classe: classe || 'pendente', origem: classe ? 'manual' : 'nenhum' });
        sv.n++; sv.v += liq; if (nt.dt > sv.ult) { sv.ult = nt.dt; sv.desc = s.desc; }
        if (classe === 'insumo') { T.servIns += liq; T.pisC += liq * PIS; T.cofC += liq * COF; T.pcServ += liq * (PIS + COF); }
        else if (!classe) issue('info', 'SERV_PEND', 'Serviço tomado sem classificação (' + (s.xTrib || s.cTribNac) + '). Se for insumo da prestação de serviço, classifique na aba Serviços e fretes para creditar PIS/COFINS.', liq * (PIS + COF));
        if (s.tpRetISS === '2') { T.issRetTom += s.vISS; issue('info', 'ISS_RET', 'ISS de ' + money(s.vISS) + ' retido pela empresa: recolher a guia ao município de ' + (s.munIncid || 'incidência') + '.', 0); }
        T.retFedTom += retFed;
      }
      T.ibs += nt.t.vIBS; T.cbs += nt.t.vCBS;
      var infoS = prestada ? 'ISS ' + money(s.vISS) + (s.tpRetISS === '2' ? ' (retido pelo tomador)' : ' a recolher') + ' · PIS/COFINS ' + money(r2(T.pisD + T.cofD))
        : (T.pcServ > 0 ? 'insumo de serviço: crédito de PIS/COFINS ' + money(r2(T.pcServ)) : (prodCad['SERV|' + nt.eC + '|' + s.cTribNac] ? 'sem crédito de PIS/COFINS' : 'serviço sem classificação'));
      fechar(nt, dir, prestada, true, p, T, issues, { cod: s.cTribNac, serv: s.xTrib, desc: s.desc, iss: s.vISS, issRet: s.tpRetISS === '2', info: infoS });
    }

    notas.forEach(function (nt) {
      if (seen[nt.ch]) return; seen[nt.ch] = 1;
      if (cancel[nt.ch] || nt.st === '101' || nt.st === '135' || nt.st === '151' || nt.st === '155') { res.canceladas++; return; }
      if (nt.tipoDoc === 'cte') { if ((nt.env || []).indexOf(cnpj) < 0) { res.ignoradas++; return; } analisarCte(nt); return; }
      if (nt.tipoDoc === 'nfse') { analisarNfse(nt); return; }
      var emitente = nt.eC === cnpj, destinatario = nt.dC === cnpj;
      if (!emitente && !destinatario) { res.ignoradas++; return; }
      var dir;
      if (emitente) dir = nt.tp === '0' ? 'E' : 'S';
      else dir = nt.tp === '0' ? 'S' : 'E';
      var proprio = emitente; // nota emitida pelo cliente
      var interna = nt.idDest === '1' || (nt.eUF && nt.eUF === nt.dUF);
      var pos = nt.dt >= corte;
      var parte = dir === 'S' ? (proprio ? { c: nt.dC, n: nt.dN, uf: nt.dUF } : { c: nt.eC, n: nt.eN, uf: nt.eUF })
                              : (proprio ? { c: nt.dC, n: nt.dN, uf: nt.dUF } : { c: nt.eC, n: nt.eN, uf: nt.eUF });
      var quem = proprio ? 'cliente' : 'fornecedor';

      var T = emptyTot();
      var issues = [];
      function issue(sev, it, codigo, msg, impacto, aj) {
        issues.push({ sev: sev, quem: quem, cod: codigo, msg: msg, ch: nt.ch, n: nt.n, dt: nt.dt, parte: parte.n,
          item: it ? it.k : null, x: it ? it.x : '', ncm: it ? it.ncm : '', imp: r2(impacto || 0), aj: aj || null });
      }
      if (dir === 'S') T.nS = 1; else T.nE = 1;
      T.ibs = nt.t.vIBS; T.cbs = nt.t.vCBS;

      var semDifal = false;
      var garantia = proprio && dir === 'S' && /garant|devolu|troca|defeit/i.test(nt.nat || '');
      nt.it.forEach(function (it) {
        var pos = nt.dt >= corteDe(it.ncm);
        var nat = natureza(it.cf);
        // remessa do produto defeituoso ao fornecedor = devolução (RICMS/SP, art. 4º, IV; RC 26.649/2022)
        if (garantia && /^[56]949$/.test(it.cf)) nat = 'devCompra';
        if (!proprio) {
          // Em nota de terceiro o CFOP é o do emitente: converte para a ótica do cliente
          if (dir === 'E') nat = nat === 'venda' ? 'compra' : nat === 'devCompra' ? 'devVenda' : nat === 'transfS' ? 'transfE' : 'outrasE';
          else nat = 'devCompra';
        }
        var monoR = monoRegra(it.ncm, it.ex), mono = monoDe(it), seg = isSeg(it.ncm, it.cest);
        if (monoR === 'cond' && proprio && dir === 'S' && !condAvisado[it.ncm]) {
          condAvisado[it.ncm] = 1;
          issue('info', it, 'MONO_COND', 'NCM ' + it.ncm + ' é monofásico só conforme a destinação (Anexos I e II da Lei 10.485/2002). O portal seguiu o CST ' + (it.cP || '–') + ' da nota (' + (mono ? 'monofásico' : 'tributado') + '); confirme se a peça atende à descrição da lei.', 0);
        }
        var prodPend = false;
        if (dir === 'E' && !proprio && nat === 'compra') {
          var pk = chaveProduto(nt.eC, it);
          var classe = prodCad[pk], origem = 'manual';
          if (!classe) { classe = classeNcm(it.ncm); origem = 'ncm'; }
          if (!classe && (seg || monoR || varejo)) { classe = 'revenda'; origem = 'sugerido'; }
          if (!classe) { classe = 'pendente'; origem = 'nenhum'; }
          if (classe === 'revenda') { /* revenda: o escopo de ST vem da lista de ST/CEST */ }
          else if (classe === 'uso') nat = 'uso';
          else if (classe === 'ativo') nat = 'ativo';
          else if (classe === 'insumo') nat = 'insumo';
          else prodPend = true;
          var pr = res.produtos[pk] || (res.produtos[pk] = { k: pk, cp: it.cp, x: it.x, ncm: it.ncm, fc: nt.eC, fn: nt.eN, n: 0, v: 0, ult: '', classe: classe, origem: origem, mono: mono, monoCond: monoR === 'cond', st: seg });
          pr.n++; pr.v += it.vp - it.vd; if (nt.dt > pr.ult) { pr.ult = nt.dt; pr.x = it.x; }
        }
        var receita = it.vp - it.vd + it.vf;
        var calcIcms = r2(it.bc * it.p / 100);
        var tribST = ['10', '30', '60', '70', '201', '202', '203', '500'].indexOf(it.cst) >= 0;
        var credIcms = dir === 'E' && !(!pos && seg && tribST) && ['uso', 'ativo', 'insumo'].indexOf(nat) < 0;
        var ajC = function (campo, v) { if (campo === 'icmsC' && !credIcms) return null; var o = {}; o[campo] = v; return { c: o }; };

        /* ICMS */
        if (dir === 'S') {
          T.icmsD += it.v;
        } else {
          var stAnterior = (!pos && seg && tribST) || (varejo && tribST);
          if (stAnterior) { /* regime de ST: imposto encerrado, sem crédito */ }
          else if (nat === 'uso') { T.icmsUso += it.v; T.compOut += receita + it.vIPI; }
          else if (nat === 'ativo') { T.ciap += it.v; T.compOut += receita + it.vIPI; }
          else if (nat === 'insumo') { T.icmsUso += it.v; T.compIns += receita + it.vIPI; }
          else T.icmsC += it.v + (it.cSN || 0); // fornecedor do Simples: crédito informado em vCredICMSSN (LC 123/2006, art. 23)
          T.stE += it.vst;
        }

        /* PIS/COFINS não cumulativo */
        if (dir === 'S' && nat === 'venda') {
          T.vendas += receita;
          var trPc = pcTrat(it);
          if (trPc === 'mono') T.rMono += receita; else if (trPc === 'zero') T.rZero += receita; else if (trPc === 'st') T.rSTpc += receita;
          if (CST_GRUPO(it.cst) === 'st') T.rSTicms += receita;
          if (mono) res.mono.vendas += receita;
          else { var b = Math.max(0, receita - it.v); T.pisD += b * PIS; T.cofD += b * COF; }
          T.pisDest += it.vP; T.cofDest += it.vC;
        } else if (dir === 'E' && nat === 'devVenda') {
          if (!mono) { var bd = Math.max(0, receita - it.v); T.pisD -= bd * PIS; T.cofD -= bd * COF; }
        } else if (dir === 'E' && nat === 'compra') {
          T.compras += receita + it.vIPI;
          if (mono) res.mono.compras += receita;
          else { var bc = Math.max(0, receita + it.vIPI - it.v); T.pisC += bc * PIS; T.cofC += bc * COF; }
        } else if (dir === 'E' && nat === 'insumo') {
          // insumo da prestação de serviço: crédito de PIS/COFINS (art. 3º, II), sem crédito de ICMS
          if (!mono) { var bi = Math.max(0, receita + it.vIPI - it.v); T.pisC += bi * PIS; T.cofC += bi * COF; }
        } else if (dir === 'S' && nat === 'devCompra') {
          if (!mono) { var be = Math.max(0, receita + it.vIPI - it.v); T.pisC -= be * PIS; T.cofC -= be * COF; }
        }

        /* ---- Auditoria ---- */
        if (it.bc > 0 && it.p > 0 && Math.abs(calcIcms - it.v) > 0.05) {
          issue('erro', it, 'ICMS_CALC', 'ICMS destacado (' + money(it.v) + ') não confere com base × alíquota (' + money(calcIcms) + ').', Math.abs(calcIcms - it.v), ajC(dir === 'S' ? 'icmsD' : 'icmsC', calcIcms - it.v));
        }

        var regRem = dir === 'S' && proprio && nat !== 'devCompra' && nt.tp === '1' ? regraRemessa(it.cf) : null;
        if (dir === 'S' && proprio && nat === 'devCompra') auditarDevolucao(nt, it, receita, issue);
        else if (regRem) auditarRemessa(nt, it, regRem, receita, issue);
        else if (dir === 'S' && proprio) {
          if (pos && seg && interna && !tribST && /^5(401|403|405)$/.test(it.cf) && (it.cst === '00' || it.cst === '20') && it.v > 0) {
            issue('alerta', it, 'CFOP_ST', 'ICMS correto (' + it.p + '% destacado), mas o CFOP ' + it.cf + ' é de ST. Corrigir para 5.102 por CC-e; não muda o imposto.', 0);
          } else if (pos && seg && interna && (tribST || /^5(401|403|405)$/.test(it.cf))) {
            issue('erro', it, 'ST_SAIDA', 'Saída interna ainda emitida como ST (CST ' + it.cst + ', CFOP ' + it.cf + ') após 01/10/2026. Deve destacar ICMS próprio a ' + aliqInt + '%.', receita * aliqInt / 100 - it.v, ajC('icmsD', receita * aliqInt / 100 - it.v));
          } else if (pos && seg && interna && (it.cst === '00' || it.cst === '20') && it.p && it.p !== aliqInt) {
            issue('alerta', it, 'ALIQ_INT', 'Alíquota interna de ' + it.p + '% (geral de SP: ' + aliqInt + '%). Conferir se há fundamento.', Math.max(0, it.bc * (aliqInt - it.p) / 100), ajC('icmsD', it.bc * (aliqInt - it.p) / 100));
          } else if (pos && seg && interna && ['40', '41', '50', '51', '90'].indexOf(it.cst) >= 0 && nat === 'venda') {
            issue('alerta', it, 'SEM_TRIB', 'Venda sem destaque de ICMS (CST ' + it.cst + '). Conferir fundamento.', receita * aliqInt / 100, ajC('icmsD', receita * aliqInt / 100));
          }
          if (varejo && classif && interna && nat === 'venda') {
            var cI = cls(it);
            if (cI && !cI.erro && !cI.icms.cond && cI.st.st !== 'cest') {
              var ge = cI.icms.cst === '60' || cI.icms.cst === '500' ? 'st' : (cI.icms.cst === '40' || cI.icms.cst === '103') ? 'isento' : cI.icms.cst === '20' ? 'red' : 'trib';
              var gn = CST_GRUPO(it.cst), base0 = it.vp - it.vd, carga = base0 > 0 ? it.v / base0 * 100 : 0;
              var simples = regime === 'simples', erroI = false;
              var desdeST = cI.st.regra && cI.st.regra.desde ? cI.st.regra.desde.split('/').reverse().join('-') : '';
              if (desdeST && nt.dt < desdeST) { ge = 'st'; cI = { icms: { titulo: 'Substituição tributária (antes de ' + cI.st.regra.desde + ')', cst: simples ? '500' : '60', carga: 0 }, st: { st: 'sim', regra: cI.st.regra } }; }
              if (simples) erroI = (ge === 'st') !== (gn === 'st');
              else if (ge === 'red' || ge === 'trib') erroI = (gn !== 'trib' && gn !== 'red') || Math.abs(carga - cI.icms.carga) > 0.6;
              else erroI = ge !== gn;
              if (erroI) {
                var espV = simples ? it.v : (ge === 'st' || ge === 'isento') ? 0 : base0 * cI.icms.carga / 100;
                var lei = cI.st.st === 'sim' && cI.st.regra ? cI.st.regra.l : cI.icms.regra ? cI.icms.regra.l : 'RICMS/SP, art. 52, I';
                issue('erro', it, 'CAD_ICMS', 'Saiu com CST ' + (it.cst || '–') + (carga ? ' e carga de ' + r2(carga) + '%' : ' sem ICMS') + '; o esperado é ' + cI.icms.titulo.charAt(0).toLowerCase() + cI.icms.titulo.slice(1) + ' (CST ' + cI.icms.cst + '; ' + lei + '). Corrigir o cadastro do produto no sistema emissor.', Math.abs(espV - it.v), simples ? null : { c: { icmsD: espV - it.v } });
              }
            }
          }
          if (!interna && nt.mod === '55' && it.p > 0 && nat === 'venda') {
            var esp = aliqInterestadual(it.o, nt.dUF);
            if (it.p !== esp) issue('erro', it, 'ALIQ_INTER', 'Alíquota interestadual de ' + it.p + '% para ' + nt.dUF + ' (origem ' + it.o + '): esperado ' + esp + '%.', Math.abs(it.bc * (it.p - esp) / 100), ajC('icmsD', it.bc * (esp - it.p) / 100));
          }
          if (!interna && it.vst > 0) {
            issue('info', it, 'ST_INTER', 'ICMS-ST retido para ' + nt.dUF + ' (' + money(it.vst) + '). Conferir se o protocolo com essa UF continua vigente.', 0);
          }
          if (!interna && nt.dIE === '9' && nat === 'venda' && it.v > 0) semDifal = true;
          if (regime === 'simples' && nat === 'venda' && mono && ['04', '05', '06'].indexOf(it.cP) < 0) {
            var trS = pcTrat(it);
            if (trS !== 'zero') issue('alerta', it, 'MONO_SN', 'Produto ' + NOME_PC[trS] + ' saiu com CST ' + (it.cP || '–') + ' de PIS/COFINS. No Simples Nacional use CST ' + (trS === 'st' ? '05' : '04') + ' e segregue a receita no PGDAS-D para não pagar PIS/COFINS no DAS.', 0);
          } else if (regime !== 'simples' && nat === 'venda' && mono && (it.vP > 0 || it.vC > 0 || it.cP === '01' || it.cP === '02')) {
            var trM = pcTrat(it), cM = trM === 'zero' ? '06' : trM === 'st' ? '05' : '04';
            issue('erro', it, 'MONO_TRIB', 'PIS/COFINS destacado em produto ' + NOME_PC[trM] + ' (NCM ' + it.ncm + '). Na revenda não há PIS/COFINS (CST ' + cM + '): possível recolhimento indevido.', it.vP + it.vC, { a: { pisD: it.vP, cofD: it.vC } });
          } else if (regime !== 'simples' && nat === 'venda' && mono && it.cP && ['04', '05', '06'].indexOf(it.cP) < 0) {
            var trC = pcTrat(it), cEsp = trC === 'zero' ? '06' : trC === 'st' ? '05' : '04';
            var DESC_CST = { '07': 'operação isenta', '08': 'sem incidência', '09': 'com suspensão', '49': 'outras operações de saída', '99': 'outras operações' };
            issue('alerta', it, 'MONO_CST_ERR', 'Produto ' + NOME_PC[trC] + ' (NCM ' + it.ncm + ') saiu com CST ' + it.cP + (DESC_CST[it.cP] ? ' (' + DESC_CST[it.cP] + ')' : '') + ' de PIS/COFINS. O correto na revenda é CST ' + cEsp + '. Não muda o valor do imposto, mas a nota fica inconsistente com a EFD-Contribuições: corrigir o cadastro do produto no emissor.', 0);
          } else if (regime !== 'simples' && nat === 'venda' && !mono && ['07', '08', '09', '49', '99'].indexOf(it.cP) >= 0) {
            var bT = Math.max(0, receita - it.v), DESC_CS = { '07': 'operação isenta', '08': 'sem incidência', '09': 'com suspensão', '49': 'outras operações de saída', '99': 'outras operações' };
            issue('alerta', it, 'PC_CST_SAIDA', 'Venda com CST ' + it.cP + ' (' + DESC_CS[it.cP] + ') de PIS/COFINS, mas o NCM ' + it.ncm + (monoR === 'cond' ? ' só é monofásico quando a peça é própria para as máquinas e veículos indicados no Anexo II da Lei 10.485/2002, e o CST da nota não indica isso. Se for, use CST 04. Se o produto for tributado,' : ' não está nas listas de monofásicos nem de alíquota zero. Se o produto for tributado,') + ' o CST é 01, com PIS de ' + (PIS * 100).toLocaleString('pt-BR') + '% e COFINS de ' + (COF * 100).toLocaleString('pt-BR') + '% sobre a receita sem ICMS. Se for monofásico (confira os Anexos da Lei 10.485/2002), inclua o NCM na lista da empresa e use CST 04.', bT * (PIS + COF), { a: { pisD: -bT * PIS, cofD: -bT * COF } });
          } else if (nat === 'venda' && !mono && (it.cP === '04' || it.cP === '06')) {
            issue('alerta', it, 'MONO_CST', 'CST ' + it.cP + ' de PIS/COFINS em NCM ' + it.ncm + ', que não está na lista de monofásicos. Conferir se o produto é monofásico.', receita * (PIS + COF), { a: { pisD: -Math.max(0, receita - it.v) * PIS, cofD: -Math.max(0, receita - it.v) * COF } });
          } else if (nat === 'venda' && !mono && it.cP === '01' && it.vP > 0) {
            var bSem = receita - it.v, bCom = receita;
            if (Math.abs(it.vP - bSem * PIS) > 0.05 && Math.abs(it.vP - bCom * PIS) <= 0.05 && it.v > 0) {
              issue('info', it, 'TEMA69', 'PIS/COFINS calculado com o ICMS na base. A exclusão do ICMS (Tema 69 do STF) reduz o valor devido.', it.v * (PIS + COF), { a: { pisD: it.v * PIS, cofD: it.v * COF } });
            }
          }
        }

        if (dir === 'E' && !proprio) {
          if (pos && seg && interna) {
            if (it.vst > 0 || ['10', '30', '70'].indexOf(it.cst) >= 0) {
              issue('erro', it, 'ST_FORN', 'Fornecedor reteve ICMS-ST (' + money(it.vst) + ') após a exclusão do regime em 01/10/2026. Solicitar correção.', it.vst);
            } else if (it.cst === '60' || it.cst === '500') {
              issue('erro', it, 'ST60_FORN', 'Fornecedor emitiu como ST (CST ' + it.cst + ', CFOP ' + it.cf + ') sem destacar ICMS próprio. Deveria ter ' + aliqInt + '% destacado; sem destaque não há crédito.', receita * aliqInt / 100, ajC('icmsC', receita * aliqInt / 100));
            } else if ((it.cst === '00' || it.cst === '20') && !(it.v > 0)) {
              issue('erro', it, 'ICMS_ZERO_FORN', 'CST ' + it.cst + ' (tributado) sem ICMS destacado, CFOP ' + it.cf + '. Deveria ter ' + aliqInt + '% destacado; sem destaque não há crédito.', receita * aliqInt / 100, ajC('icmsC', receita * aliqInt / 100));
            } else if ((it.cst === '00' || it.cst === '20') && CFOP_ST.test(it.cf) && it.p === aliqInt) {
              issue('alerta', it, 'CFOP_FORN', 'Tributação correta (ICMS ' + it.p + '% destacado, crédito aproveitável); só o CFOP ' + it.cf + ' é de ST. Pedir ao fornecedor CC-e para o CFOP 5.102 e a correção do cadastro.', 0);
            } else if ((it.cst === '00' || it.cst === '20') && it.p && it.p !== aliqInt) {
              issue('alerta', it, 'ALIQ_FORN', 'Fornecedor aplicou ' + it.p + '% em operação interna (geral de SP: ' + aliqInt + '%).', Math.abs(it.bc * (aliqInt - it.p) / 100), ajC('icmsC', it.bc * (aliqInt - it.p) / 100));
            }
          }
          if (!interna && nt.mod === '55' && it.p > 0) {
            var espE = IMPORTADO.indexOf(String(it.o)) >= 0 ? 4 : 12;
            if (it.p !== espE) issue('erro', it, 'ALIQ_INTER_FORN', 'Fornecedor de ' + nt.eUF + ' aplicou ' + it.p + '% (esperado ' + espE + '% para SP, origem ' + it.o + ').', Math.abs(it.bc * (it.p - espE) / 100), ajC('icmsC', it.bc * (espE - it.p) / 100));
          }
          if (!interna && pos && seg && it.vst === 0 && (it.cst === '60' || it.cst === '500' || ((it.cst === '00' || it.cst === '20' || CFOP_ST.test(it.cf)) && !(it.v > 0)))) {
            var espI = IMPORTADO.indexOf(String(it.o)) >= 0 ? 4 : 12;
            issue('erro', it, 'ST_INTER60_FORN', 'Fornecedor de ' + nt.eUF + ' emitiu sem ICMS (CST ' + it.cst + ', CFOP ' + it.cf + ') após 01/10/2026. Deveria destacar a alíquota interestadual de ' + espI + '%; sem destaque não há crédito.', receita * espI / 100, ajC('icmsC', receita * espI / 100));
          } else if (!interna && pos && seg && it.v > 0 && /^640[1-5]$/.test(it.cf)) {
            issue('alerta', it, 'CFOP_FORN', 'Tributação correta (ICMS ' + it.p + '% destacado, crédito aproveitável); só o CFOP ' + it.cf + ' é de ST. Pedir ao fornecedor CC-e para o CFOP 6.102.', 0);
          }
          if (!interna && pos && seg && it.vst > 0) {
            issue('alerta', it, 'ST_INTER_FORN', 'Fornecedor de ' + nt.eUF + ' reteve ICMS-ST (' + money(it.vst) + ') para SP após 01/10/2026. Conferir o protocolo.', it.vst);
          }
          if (prodPend) {
            var credPC = Math.max(0, receita + it.vIPI - it.v) * (PIS + COF);
            issue('alerta', it, 'PROD_PEND', 'Produto sem classificação (NCM ' + it.ncm + ', fora de pneus e autopeças). Classifique na aba Produtos: se for uso e consumo ou ativo, o crédito de ICMS e de PIS/COFINS sai da apuração.', it.v + credPC);
          }
          if (nat === 'insumo' && mono) {
            issue('info', it, 'INSUMO_MONO', 'Insumo de serviço com NCM monofásico. A compra de revendedor vem com alíquota zero e não gera crédito de PIS/COFINS; confira se veio do fabricante.', 0);
          }
          if (nat === 'compra' && mono && (it.vP > 0 || it.vC > 0) && it.cP !== '02') {
            issue('info', it, 'MONO_FORN', 'Fornecedor destacou PIS/COFINS em item monofásico. A compra para revenda não gera crédito.', 0);
          }
        }
      });
      if (dir === 'E' && !proprio) {
        var dups = (assinaturas[assinatura(nt)] || []).filter(function (o) { return o.ch !== nt.ch; });
        if (dups.length) issue('alerta', null, 'DUP_NF', 'Mesmos itens, valores e data da nota ' + dups.map(function (o) { return 'nº ' + o.n; }).join(', ') + ' do mesmo fornecedor: possível nota substituída. Confirme se uma delas foi cancelada; se as duas forem escrituradas, há duplicidade.', 0);
      }
      if (semDifal && !nt.dif) issue('alerta', null, 'DIFAL', 'Venda interestadual a não contribuinte sem o grupo de partilha do DIFAL.', 0);

      ajusteRegime(T);
      ['icmsD', 'icmsC', 'icmsUso', 'ciap', 'pisD', 'pisC', 'cofD', 'cofC', 'vendas', 'compras', 'compOut', 'compIns', 'stE', 'pisDest', 'cofDest', 'rMono', 'rZero', 'rSTpc', 'rSTicms'].forEach(function (k) { T[k] = r2(T[k]); });

      var fatos = [], todosMono = nt.it.length && nt.it.every(function (i) { return monoDe(i); });
      var stAntes = nt.it.some(function (i) { return nt.dt < corteDe(i.ncm) && isSeg(i.ncm, i.cest) && ['10', '30', '60', '70', '201', '202', '203', '500'].indexOf(i.cst) >= 0; });
      if (dir === 'E') {
        if (T.icmsC > 0) fatos.push('crédito de ICMS ' + money(T.icmsC));
        else if (stAntes) fatos.push('ST antes de 01/10: imposto já recolhido, sem crédito de ICMS');
        else if (T.icmsUso + T.ciap > 0) fatos.push('uso, insumo ou ativo: sem crédito direto de ICMS');
        if (T.pisC + T.cofC > 0) fatos.push('crédito de PIS/COFINS ' + money(T.pisC + T.cofC));
        else if (todosMono) fatos.push((varejo ? 'monofásico ou alíquota zero' : 'monofásico') + ': sem crédito de PIS/COFINS');
      } else {
        if (T.icmsD > 0) fatos.push('ICMS ' + money(T.icmsD) + ' destacado');
        if (todosMono && T.vendas > 0) fatos.push((varejo ? 'monofásico ou alíquota zero' : 'monofásico') + ': PIS/COFINS zero');
        else if (T.pisD + T.cofD > 0) fatos.push('PIS/COFINS ' + money(T.pisD + T.cofD));
      }
      var resumo = { info: fatos.join(' · '), ch: nt.ch, n: nt.n, s: nt.s, mod: nt.mod, dt: nt.dt, dir: dir, proprio: proprio, interna: interna,
        parte: parte, vNF: nt.t.vNF, T: T, nIss: issues.length,
        pior: issues.reduce(function (a, i) { return i.sev === 'erro' ? 'erro' : (a === 'erro' ? a : (i.sev === 'alerta' ? 'alerta' : a || 'info')); }, '') };
      res.notas.push(resumo);
      Array.prototype.push.apply(res.pend, issues);
      if (!res.dias[nt.dt]) res.dias[nt.dt] = emptyTot();
      addTot(res.dias[nt.dt], T);
    });
    res.notas.sort(function (a, b) { return a.dt < b.dt ? 1 : a.dt > b.dt ? -1 : 0; });
    res.fretes.sort(function (a, b) { return a.dt < b.dt ? 1 : a.dt > b.dt ? -1 : 0; });
    Object.keys(res.servicos).forEach(function (k) { res.servicos[k].v = r2(res.servicos[k].v); });
    return res;
  }

  /* Agrupamento em semanas (seg a dom) e meses, como no painel */
  function periodos(dias) {
    var ds = Object.keys(dias).sort();
    var semanas = {}, meses = {};
    // semanas de segunda a domingo, cortadas na virada do mês: cada semana pertence a um mês só
    ds.forEach(function (d) {
      var m0 = d.slice(0, 7), primeiro = m0 + '-01', seg = mondayOf(d), dom = addDays(seg, 6);
      var ultimo = addDays(addDays(primeiro, 32).slice(0, 7) + '-01', -1);
      var ini = seg < primeiro ? primeiro : seg, fim = dom > ultimo ? ultimo : dom;
      if (!semanas[ini]) {
        var offset = (parseISO(primeiro).getUTCDay() + 6) % 7;
        semanas[ini] = { ini: ini, fim: fim, mes: m0, dias: [], num: Math.floor((+ini.slice(8) - 1 + offset) / 7) + 1 };
      }
      semanas[ini].dias.push(d);
      var m = d.slice(0, 7);
      if (!meses[m]) meses[m] = { mes: m, dias: [] };
      meses[m].dias.push(d);
    });
    return { semanas: Object.keys(semanas).sort().reverse().map(function (k) { return semanas[k]; }),
      meses: Object.keys(meses).sort().reverse().map(function (k) { return meses[k]; }) };
  }

  function somaDias(dias, lista) {
    var t = emptyTot();
    lista.forEach(function (d) { if (dias[d]) addTot(t, dias[d]); });
    return t;
  }

  function money(v) {
    return 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return { parseDoc: parseDoc, analisar: analisar, periodos: periodos, somaDias: somaDias, emptyTot: emptyTot,
    natureza: natureza, DEFAULT_MONO: DEFAULT_MONO, DEFAULT_ST: DEFAULT_ST, parseMono: parseMono, makeMono: makeMono,
    money: money, chaveProduto: chaveProduto, mondayOf: mondayOf, addDays: addDays, r2: r2 };
})();
if (typeof module !== 'undefined') module.exports = Fiscal;
