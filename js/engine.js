/* ===== Motor fiscal: leitura de NF-e/NFC-e, apuração e auditoria =====
   Regime: Lucro Real (PIS/COFINS não cumulativo). UF da empresa: SP.
   Corte do fim da ST (pneus e autopeças em SP): 01/10/2026 (Portaria SRE 34/2026). */
var Fiscal = (function () {
  'use strict';

  var DEFAULT_MONO = [
    // Pneus e câmaras de ar (Lei 10.485/2002, art. 5º)
    '4011', '4013',
    // Autopeças — Anexos I e II da Lei 10.485/2002 (lista inicial; conferir e ajustar)
    '4009', '40103', '40161010', '40169990', '45049000', '6813', '70071100', '70072100', '70091000',
    '73201000', '83012000', '83021000', '83023000', '84073290', '84073390', '84073490', '840820',
    '840991', '840999', '84131900', '841330', '84135010', '84136019', '84137010', '84138100',
    '84141000', '84142000', '84143019', '84145990', '84148021', '84148022', '841520', '84212300',
    '84212990', '84213100', '84213990', '84314100', '84314200', '84339090', '84812090', '84813000',
    '84818092', '84819090', '8482', '8483', '8484', '850520', '850710', '8511', '851220',
    '851240', '851290', '852721', '85361000', '85365090', '853910', '853921', '85443000',
    '870600', '8707', '8708', '902610', '902620', '9029', '90318040', '9032892', '91040000', '94012000'
  ];
  var DEFAULT_SEGMENTO_EXTRA = ['4012', '8507'];

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
    var infEvento = first(root, 'infEvento');
    if (infEvento && !first(root, 'infNFe')) {
      return {
        tipo: 'evento',
        chave: txt(infEvento, 'chNFe'),
        tpEvento: txt(infEvento, 'tpEvento'),
        cStat: txt(first(root, 'retEvento') || root, 'cStat')
      };
    }
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

    var dets = inf.getElementsByTagName('det');
    var difal = false;
    for (var i = 0; i < dets.length; i++) {
      var det = dets[i];
      var prod = first(det, 'prod'), imp = first(det, 'imposto');
      var icmsWrap = first(imp, 'ICMS');
      var icms = firstElementChild(icmsWrap);
      var pis = firstElementChild(first(imp, 'PIS'));
      var cof = firstElementChild(first(imp, 'COFINS'));
      var ipi = first(imp, 'IPI');
      if (first(imp, 'ICMSUFDest')) difal = true;
      var cst = icms ? (txt(icms, 'CST') || txt(icms, 'CSOSN')) : '';
      nota.it.push({
        k: num(det.getAttribute('nItem')) || (i + 1),
        cp: txt(prod, 'cProd').slice(0, 40),
        x: txt(prod, 'xProd').slice(0, 70),
        ncm: txt(prod, 'NCM'),
        cest: txt(prod, 'CEST'),
        cf: txt(prod, 'CFOP'),
        o: icms ? txt(icms, 'orig') : '',
        cst: cst,
        bc: num(txt(icms, 'vBC')),
        p: num(txt(icms, 'pICMS')),
        v: num(txt(icms, 'vICMS')),
        vst: num(txt(icms, 'vICMSST')),
        stR: num(txt(icms, 'vICMSSTRet')),
        cP: pis ? txt(pis, 'CST') : '',
        vP: num(txt(pis, 'vPIS')),
        cC: cof ? txt(cof, 'CST') : '',
        vC: num(txt(cof, 'vCOFINS')),
        vIPI: ipi ? num(txt(ipi, 'vIPI')) : 0,
        vp: num(txt(prod, 'vProd')),
        vd: num(txt(prod, 'vDesc')),
        vf: num(txt(prod, 'vFrete')) + num(txt(prod, 'vSeg')) + num(txt(prod, 'vOutro'))
      });
    }
    nota.dif = difal;
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
    return { icmsD: 0, icmsC: 0, icmsUso: 0, ciap: 0, pisD: 0, pisC: 0, cofD: 0, cofC: 0, vendas: 0, compras: 0,
      stE: 0, ibs: 0, cbs: 0, nS: 0, nE: 0, pisDest: 0, cofDest: 0 };
  }
  function addTot(a, b) { for (var k in b) a[k] = (a[k] || 0) + b[k]; }

  // notas: array de notas; cfg: {cnpj, corte, mono[], segmento[], aliqInterna}
  function analisar(notas, cfg) {
    cfg = cfg || {};
    var cnpj = String(cfg.cnpj || '').replace(/\D/g, '');
    var corte = cfg.corte || '2026-10-01';
    var aliqInt = cfg.aliqInterna || 18;
    var isMono = makeMatcher(cfg.mono || DEFAULT_MONO);
    var isSeg = makeMatcher((cfg.mono || DEFAULT_MONO).concat(cfg.segmento || DEFAULT_SEGMENTO_EXTRA));
    var cancel = cfg.canceladas || {};
    var prodCad = cfg.produtos || {};          // { 'cnpjFornecedor|codigo': 'revenda'|'uso'|'ativo' }
    var ncmCad = cfg.ncmClasse || {};          // { '48025610': 'uso', ... } (prefixo de NCM)
    var ncmKeys = Object.keys(ncmCad).sort(function (a, b) { return b.length - a.length; });
    function classeNcm(ncm) { for (var i = 0; i < ncmKeys.length; i++) if (String(ncm).indexOf(ncmKeys[i]) === 0) return ncmCad[ncmKeys[i]]; return null; }

    var res = { notas: [], pend: [], dias: {}, ignoradas: 0, canceladas: 0, mono: { vendas: 0, compras: 0 }, produtos: {} };
    var seen = {};

    notas.forEach(function (nt) {
      if (seen[nt.ch]) return; seen[nt.ch] = 1;
      if (cancel[nt.ch] || nt.st === '101' || nt.st === '135' || nt.st === '151' || nt.st === '155') { res.canceladas++; return; }
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
      function issue(sev, it, codigo, msg, impacto) {
        issues.push({ sev: sev, quem: quem, cod: codigo, msg: msg, ch: nt.ch, n: nt.n, dt: nt.dt, parte: parte.n,
          item: it ? it.k : null, x: it ? it.x : '', ncm: it ? it.ncm : '', imp: r2(impacto || 0) });
      }
      if (dir === 'S') T.nS = 1; else T.nE = 1;
      T.ibs = nt.t.vIBS; T.cbs = nt.t.vCBS;

      var semDifal = false;
      nt.it.forEach(function (it) {
        var nat = natureza(it.cf);
        if (!proprio) {
          // Em nota de terceiro o CFOP é o do emitente: converte para a ótica do cliente
          if (dir === 'E') nat = nat === 'venda' ? 'compra' : nat === 'devCompra' ? 'devVenda' : nat === 'transfS' ? 'transfE' : 'outrasE';
          else nat = 'devCompra';
        }
        var mono = isMono(it.ncm), seg = isSeg(it.ncm);
        var prodPend = false;
        if (dir === 'E' && !proprio && nat === 'compra') {
          var pk = chaveProduto(nt.eC, it);
          var classe = prodCad[pk], origem = 'manual';
          if (!classe) { classe = classeNcm(it.ncm); origem = 'ncm'; }
          if (!classe && seg) { classe = 'revenda'; origem = 'sugerido'; }
          if (!classe) { classe = 'pendente'; origem = 'nenhum'; }
          if (classe === 'revenda') seg = true;
          else if (classe === 'uso') nat = 'uso';
          else if (classe === 'ativo') nat = 'ativo';
          else prodPend = true;
          var pr = res.produtos[pk] || (res.produtos[pk] = { k: pk, cp: it.cp, x: it.x, ncm: it.ncm, fc: nt.eC, fn: nt.eN, n: 0, v: 0, ult: '', classe: classe, origem: origem, mono: mono });
          pr.n++; pr.v += it.vp - it.vd; if (nt.dt > pr.ult) { pr.ult = nt.dt; pr.x = it.x; }
        }
        var receita = it.vp - it.vd + it.vf;
        var calcIcms = r2(it.bc * it.p / 100);
        var tribST = ['10', '30', '60', '70', '201', '202', '203', '500'].indexOf(it.cst) >= 0;

        /* ICMS */
        if (dir === 'S') {
          T.icmsD += it.v;
        } else {
          var stAnterior = !pos && seg && tribST;
          if (stAnterior) { /* regime de ST: imposto encerrado, sem crédito */ }
          else if (nat === 'uso') T.icmsUso += it.v;
          else if (nat === 'ativo') T.ciap += it.v;
          else T.icmsC += it.v;
          T.stE += it.vst;
        }

        /* PIS/COFINS não cumulativo */
        if (dir === 'S' && nat === 'venda') {
          T.vendas += receita;
          if (mono) res.mono.vendas += receita;
          else { var b = Math.max(0, receita - it.v); T.pisD += b * PIS; T.cofD += b * COF; }
          T.pisDest += it.vP; T.cofDest += it.vC;
        } else if (dir === 'E' && nat === 'devVenda') {
          if (!mono) { var bd = Math.max(0, receita - it.v); T.pisD -= bd * PIS; T.cofD -= bd * COF; }
        } else if (dir === 'E' && nat === 'compra') {
          T.compras += receita + it.vIPI;
          if (mono) res.mono.compras += receita;
          else { var bc = Math.max(0, receita + it.vIPI - it.v); T.pisC += bc * PIS; T.cofC += bc * COF; }
        } else if (dir === 'S' && nat === 'devCompra') {
          if (!mono) { var be = Math.max(0, receita + it.vIPI - it.v); T.pisC -= be * PIS; T.cofC -= be * COF; }
        }

        /* ---- Auditoria ---- */
        if (it.bc > 0 && it.p > 0 && Math.abs(calcIcms - it.v) > 0.05) {
          issue('erro', it, 'ICMS_CALC', 'ICMS destacado (' + money(it.v) + ') não confere com base × alíquota (' + money(calcIcms) + ').', Math.abs(calcIcms - it.v));
        }

        if (dir === 'S' && proprio) {
          if (pos && seg && interna && (tribST || /^5(401|403|405)$/.test(it.cf))) {
            issue('erro', it, 'ST_SAIDA', 'Saída interna ainda emitida como ST (CST ' + it.cst + ', CFOP ' + it.cf + ') após 01/10/2026. Deve destacar ICMS próprio a ' + aliqInt + '%.', receita * aliqInt / 100 - it.v);
          } else if (pos && seg && interna && (it.cst === '00' || it.cst === '20') && it.p && it.p !== aliqInt) {
            issue('alerta', it, 'ALIQ_INT', 'Alíquota interna de ' + it.p + '% (geral de SP: ' + aliqInt + '%). Conferir se há fundamento.', Math.max(0, it.bc * (aliqInt - it.p) / 100));
          } else if (pos && seg && interna && ['40', '41', '50', '51', '90'].indexOf(it.cst) >= 0 && nat === 'venda') {
            issue('alerta', it, 'SEM_TRIB', 'Venda sem destaque de ICMS (CST ' + it.cst + '). Conferir fundamento.', receita * aliqInt / 100);
          }
          if (!interna && nt.mod === '55' && it.p > 0 && nat === 'venda') {
            var esp = aliqInterestadual(it.o, nt.dUF);
            if (it.p !== esp) issue('erro', it, 'ALIQ_INTER', 'Alíquota interestadual de ' + it.p + '% para ' + nt.dUF + ' (origem ' + it.o + '): esperado ' + esp + '%.', Math.abs(it.bc * (it.p - esp) / 100));
          }
          if (!interna && it.vst > 0) {
            issue('info', it, 'ST_INTER', 'ICMS-ST retido para ' + nt.dUF + ' (' + money(it.vst) + '). Conferir se o protocolo com essa UF continua vigente.', 0);
          }
          if (!interna && nt.dIE === '9' && nat === 'venda' && it.v > 0) semDifal = true;
          if (nat === 'venda' && mono && (it.vP > 0 || it.vC > 0 || it.cP === '01' || it.cP === '02')) {
            issue('erro', it, 'MONO_TRIB', 'PIS/COFINS destacado em produto monofásico (NCM ' + it.ncm + '). Na revenda a alíquota é zero (CST 04): possível recolhimento indevido.', it.vP + it.vC);
          } else if (nat === 'venda' && !mono && (it.cP === '04' || it.cP === '06')) {
            issue('alerta', it, 'MONO_CST', 'CST ' + it.cP + ' de PIS/COFINS em NCM ' + it.ncm + ', que não está na lista de monofásicos. Conferir se o produto é monofásico.', receita * (PIS + COF));
          } else if (nat === 'venda' && !mono && it.cP === '01' && it.vP > 0) {
            var bSem = receita - it.v, bCom = receita;
            if (Math.abs(it.vP - bSem * PIS) > 0.05 && Math.abs(it.vP - bCom * PIS) <= 0.05 && it.v > 0) {
              issue('info', it, 'TEMA69', 'PIS/COFINS calculado com o ICMS na base. A exclusão do ICMS (Tema 69 do STF) reduz o valor devido.', it.v * (PIS + COF));
            }
          }
        }

        if (dir === 'E' && !proprio) {
          if (pos && seg && interna) {
            if (it.vst > 0 || ['10', '30', '70'].indexOf(it.cst) >= 0) {
              issue('erro', it, 'ST_FORN', 'Fornecedor reteve ICMS-ST (' + money(it.vst) + ') após a exclusão do regime em 01/10/2026. Solicitar correção.', it.vst);
            } else if (it.cst === '60' || it.cst === '500') {
              issue('erro', it, 'ST60_FORN', 'Fornecedor emitiu como ST (CST ' + it.cst + ') sem destacar ICMS próprio. Sem destaque não há crédito.', receita * aliqInt / 100);
            } else if ((it.cst === '00' || it.cst === '20') && it.p && it.p !== aliqInt) {
              issue('alerta', it, 'ALIQ_FORN', 'Fornecedor aplicou ' + it.p + '% em operação interna (geral de SP: ' + aliqInt + '%).', Math.abs(it.bc * (aliqInt - it.p) / 100));
            }
          }
          if (!interna && nt.mod === '55' && it.p > 0) {
            var espE = IMPORTADO.indexOf(String(it.o)) >= 0 ? 4 : 12;
            if (it.p !== espE) issue('erro', it, 'ALIQ_INTER_FORN', 'Fornecedor de ' + nt.eUF + ' aplicou ' + it.p + '% (esperado ' + espE + '% para SP, origem ' + it.o + ').', Math.abs(it.bc * (it.p - espE) / 100));
          }
          if (!interna && pos && seg && it.vst > 0) {
            issue('alerta', it, 'ST_INTER_FORN', 'Fornecedor de ' + nt.eUF + ' reteve ICMS-ST (' + money(it.vst) + ') para SP após 01/10/2026. Conferir o protocolo.', it.vst);
          }
          if (prodPend) {
            var credPC = Math.max(0, receita + it.vIPI - it.v) * (PIS + COF);
            issue('alerta', it, 'PROD_PEND', 'Produto sem classificação (NCM ' + it.ncm + ', fora de pneus e autopeças). Classifique na aba Produtos: se for uso e consumo ou ativo, o crédito de ICMS e de PIS/COFINS sai da apuração.', it.v + credPC);
          }
          if (nat === 'compra' && mono && (it.vP > 0 || it.vC > 0) && it.cP !== '02') {
            issue('info', it, 'MONO_FORN', 'Fornecedor destacou PIS/COFINS em item monofásico. A compra para revenda não gera crédito.', 0);
          }
        }
      });
      if (semDifal && !nt.dif) issue('alerta', null, 'DIFAL', 'Venda interestadual a não contribuinte sem o grupo de partilha do DIFAL.', 0);

      ['icmsD', 'icmsC', 'icmsUso', 'ciap', 'pisD', 'pisC', 'cofD', 'cofC', 'vendas', 'compras', 'stE', 'pisDest', 'cofDest'].forEach(function (k) { T[k] = r2(T[k]); });

      var resumo = { ch: nt.ch, n: nt.n, s: nt.s, mod: nt.mod, dt: nt.dt, dir: dir, proprio: proprio, interna: interna,
        parte: parte, vNF: nt.t.vNF, T: T, nIss: issues.length,
        pior: issues.reduce(function (a, i) { return i.sev === 'erro' ? 'erro' : (a === 'erro' ? a : (i.sev === 'alerta' ? 'alerta' : a || 'info')); }, '') };
      res.notas.push(resumo);
      Array.prototype.push.apply(res.pend, issues);
      if (!res.dias[nt.dt]) res.dias[nt.dt] = emptyTot();
      addTot(res.dias[nt.dt], T);
    });
    res.notas.sort(function (a, b) { return a.dt < b.dt ? 1 : a.dt > b.dt ? -1 : 0; });
    return res;
  }

  /* Agrupamento em semanas (seg a dom) e meses, como no painel */
  function periodos(dias) {
    var ds = Object.keys(dias).sort();
    var semanas = {}, meses = {};
    ds.forEach(function (d) {
      var seg = mondayOf(d);
      if (!semanas[seg]) semanas[seg] = { ini: seg, fim: addDays(seg, 6), mes: seg.slice(0, 7), dias: [] };
      semanas[seg].dias.push(d);
      var m = d.slice(0, 7);
      if (!meses[m]) meses[m] = { mes: m, dias: [] };
      meses[m].dias.push(d);
    });
    var porMes = {};
    Object.keys(semanas).sort().forEach(function (k) {
      var w = semanas[k];
      (porMes[w.mes] = porMes[w.mes] || []).push(w);
    });
    Object.keys(porMes).forEach(function (m) { porMes[m].forEach(function (w, i) { w.num = i + 1; }); });
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
    natureza: natureza, DEFAULT_MONO: DEFAULT_MONO, DEFAULT_SEGMENTO_EXTRA: DEFAULT_SEGMENTO_EXTRA,
    money: money, chaveProduto: chaveProduto, mondayOf: mondayOf, addDays: addDays, r2: r2 };
})();
if (typeof module !== 'undefined') module.exports = Fiscal;
