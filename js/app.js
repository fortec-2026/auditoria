/* ===== Portal Fiscal — interface (site estático para GitHub Pages) ===== */
(function () {
'use strict';
var F = Fiscal, C = Cofre, M = F.money;
var MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
var EXEMPLO_URL = 'exemplos/notas-exemplo.zip';

var S = {
  view: 'inicio',          // inicio | cliente | escritorio | painel
  emp: null,               // {id, meta, notas, canc, prodCad, ncmCad, hist, senha}
  readonly: true, exemplo: false, sujo: false, modo: 'cliente',
  locais: [], res: null, per: null,
  periodo: 'all', grupo: 'semana', tab: 'apuracao', det: 'semana',
  q: '', fQuem: 'todos', fSev: 'todos', fImp: 'todos', fProd: 'todos', porNcm: false,
  imp: null, confirmDel: false, publicando: false, erro: '', ocupado: false, gh: lerGh()
};

/* ---------- utilidades ---------- */
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function br(d) { if (!d) return ''; var p = d.split('-'); return p[2] + '/' + p[1]; }
function brFull(d) { if (!d) return ''; var p = d.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
function mesNome(m) { var p = m.split('-'); return MESES[+p[1] - 1] + '/' + p[0]; }
function fmtCnpj(c) { c = String(c || '').replace(/\D/g, ''); return c.length === 14 ? c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : c; }
function m0(v) { if (Math.abs(v) < 0.005) v = 0; return v < 0 ? '−' + M(-v) : M(v); }
function toast(t) { var el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(function () { el.hidden = true; }, 3800); }
function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
function lerGh() { try { return JSON.parse(ls('pf.github') || 'null'); } catch (e) { return null; } }
function linkCliente(id) { return location.origin + location.pathname + '#c=' + id; }
function bate(q, campos) { if (!q) return true; q = q.toLowerCase(); return campos.some(function (c) { return String(c || '').toLowerCase().indexOf(q) >= 0; }); }

var I = {
  doc: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/></svg>',
  pct: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/></svg>',
  alert: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/></svg>',
  lock: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  up: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/></svg>',
  search: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  back: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18 9 12l6-6"/></svg>',
  mark: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="M12 3.5v5M12 15.5v5M3.5 12h5M15.5 12h5"/></svg>'
};

/* ---------- arquivos ---------- */
function salvarArquivo(nome, blob) {
  var c = window.claude;
  if (c && c.use) {
    return c.use('downloads').then(function (dl) {
      if (!dl) { toast('Download indisponível nesta visualização.'); return; }
      return dl.save({ filename: nome, data: blob });
    }).catch(function () { toast('O download foi cancelado.'); });
  }
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  return Promise.resolve();
}
function lerTexto(buf) {
  var u = new Uint8Array(buf.slice(0, 200)), head = '';
  for (var i = 0; i < u.length; i++) head += String.fromCharCode(u[i]);
  var enc = /encoding=["']?(iso-8859-1|windows-1252|latin1)/i.test(head) ? 'windows-1252' : 'utf-8';
  return new TextDecoder(enc).decode(buf);
}
function processarTexto(t, acc) {
  if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);
  var doc = new DOMParser().parseFromString(t, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) { acc.erros++; return; }
  var r = F.parseDoc(doc);
  if (r.tipo === 'nfe' && r.nota.ch) acc.notas.push(r.nota);
  else if (r.tipo === 'evento') { if (r.tpEvento === '110111' && r.chave) acc.canc[r.chave] = 1; acc.eventos++; }
  else acc.outros++;
}
async function lerArquivos(files) {
  var acc = { notas: [], canc: {}, erros: 0, eventos: 0, outros: 0, arquivos: 0 };
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    if (/\.zip$/i.test(f.name)) {
      var zip = await JSZip.loadAsync(f);
      var nomes = Object.keys(zip.files).filter(function (n) { return !zip.files[n].dir && /\.xml$/i.test(n); });
      for (var j = 0; j < nomes.length; j++) {
        acc.arquivos++; processarTexto(lerTexto(await zip.files[nomes[j]].async('arraybuffer')), acc);
        if (j % 250 === 0) { S.imp = { lendo: true, arquivos: acc.arquivos }; renderOffice(); await new Promise(function (r) { setTimeout(r, 0); }); }
      }
    } else if (/\.xml$/i.test(f.name)) { acc.arquivos++; processarTexto(lerTexto(await f.arrayBuffer()), acc); }
  }
  return acc;
}
function detectarCnpj(notas) {
  var c = {}; notas.forEach(function (n) { [n.eC, n.dC].forEach(function (x) { if (x && x.length === 14) c[x] = (c[x] || 0) + 1; }); });
  var best = null; Object.keys(c).forEach(function (k) { if (!best || c[k] > c[best]) best = k; }); return best;
}
function nomeDe(notas, cnpj) { for (var i = 0; i < notas.length; i++) { if (notas[i].eC === cnpj) return notas[i].eN; if (notas[i].dC === cnpj) return notas[i].dN; } return ''; }

/* ---------- espaço de trabalho ---------- */
function novaEmpresa(cnpj, nome) {
  return { id: C.gerarId(), meta: { cnpj: cnpj, nome: nome || '', corte: '2026-10-01', mono: F.DEFAULT_MONO.slice(), publicado: null, criado: Date.now() },
    notas: [], canc: {}, prodCad: {}, ncmCad: {}, hist: [], senha: '' };
}
function deArquivo(d, senha) {
  var canc = {}; (d.canc || []).forEach(function (c) { canc[c] = 1; });
  return { id: d.meta.id, meta: d.meta, notas: d.notas || [], canc: canc, prodCad: d.prodCad || {}, ncmCad: d.ncmCad || {}, hist: d.hist || [], senha: senha || '' };
}
function paraArquivo(e) {
  var meta = Object.assign({}, e.meta, { id: e.id, publicado: Date.now() });
  return { v: 1, meta: meta, notas: e.notas, canc: Object.keys(e.canc), prodCad: e.prodCad, ncmCad: e.ncmCad, hist: e.hist };
}
function salvarLocal() {
  if (!S.emp || S.exemplo || S.readonly) return;
  clearTimeout(salvarLocal._t);
  salvarLocal._t = setTimeout(function () {
    var e = S.emp;
    C.local.gravar({ id: e.id, meta: e.meta, notas: e.notas, canc: e.canc, prodCad: e.prodCad, ncmCad: e.ncmCad, hist: e.hist, senha: e.senha, sujo: S.sujo, alterado: Date.now() })
      .catch(function () { toast('Não foi possível guardar o rascunho neste navegador.'); });
  }, 400);
}
function mudou() { S.sujo = true; salvarLocal(); }

function cfgAtual() {
  var e = S.emp, m = e.meta;
  return { cnpj: m.cnpj, corte: m.corte || '2026-10-01', mono: (m.mono && m.mono.length) ? m.mono : F.DEFAULT_MONO, canceladas: e.canc,
    produtos: mapa(e.prodCad), ncmClasse: mapa(e.ncmCad) };
}
function mapa(o) { var r = {}; Object.keys(o || {}).forEach(function (k) { if (o[k] && o[k].c) r[k] = o[k].c; }); return r; }
function recalcular() {
  if (!S.emp || !S.emp.notas.length) { S.res = null; S.per = null; return; }
  S.res = F.analisar(S.emp.notas, cfgAtual());
  S.per = F.periodos(S.res.dias);
  var ok = S.periodo === 'all' || S.per.semanas.some(function (w) { return 'w:' + w.ini === S.periodo; }) || S.per.meses.some(function (m) { return 'm:' + m.mes === S.periodo; });
  if (!ok) S.periodo = 'all';
}
function diasSel() {
  if (!S.per) return [];
  if (S.periodo === 'all') return Object.keys(S.res.dias).sort();
  var k = S.periodo.slice(2);
  if (S.periodo[0] === 'w') { var w = S.per.semanas.filter(function (x) { return x.ini === k; })[0]; return w ? w.dias : []; }
  var m = S.per.meses.filter(function (x) { return x.mes === k; })[0]; return m ? m.dias : [];
}

/* ---------- roteamento ---------- */
function rota() {
  var h = location.hash.replace(/^#/, '');
  S.erro = '';
  if (/^c=[a-z0-9]{6,}$/.test(h)) { S.view = 'cliente'; S.codigo = h.slice(2); S.emp = null; }
  else if (h === 'escritorio') { S.view = 'escritorio'; S.emp = null; carregarLocais(); }
  else { S.view = 'inicio'; S.emp = null; S.arquivoPendente = null; }
  render();
}
async function carregarLocais() {
  try { S.locais = (await C.local.listar()) || []; } catch (e) { S.locais = []; }
  S.locais.sort(function (a, b) { return (b.alterado || 0) - (a.alterado || 0); });
  if (S.view === 'escritorio') render();
}

/* ---------- render geral ---------- */
function render() {
  var app = $('app');
  if (S.view === 'inicio') app.innerHTML = vInicio();
  else if (S.view === 'cliente') app.innerHTML = vCliente();
  else if (S.view === 'escritorio') app.innerHTML = vEscritorio();
  else { app.innerHTML = vPainel(); renderOffice(); renderMain(); }
}
function nav(extra) {
  var destino = (S.view === 'escritorio' || (S.view === 'painel' && !S.readonly)) ? '#escritorio' : '#';
  return '<nav class="nav"><a class="brand" href="' + destino + '"><span class="mk">' + I.mark + '</span>Portal Fiscal</a><div class="nav-r">' + (extra || '') + '</div></nav>';
}

function vInicio() {
  return nav('<a class="btn ghost" href="#escritorio">Área do escritório</a>') +
    '<div class="card gate"><span class="eyebrow">Acesso do cliente</span><h1>Apuração da sua empresa</h1>' +
    '<p class="note">Use o código e a senha que o escritório enviou. Os dados chegam cifrados e só são abertos aqui no seu navegador.</p>' +
    '<form id="fCodigo" class="row" style="flex-direction:column;align-items:stretch"><div class="field"><label for="codigo">Código da empresa</label><input id="codigo" autocomplete="username" required></div>' +
    '<div class="field"><label for="senhaC">Senha</label><input id="senhaC" type="password" autocomplete="current-password" required></div>' +
    (S.erro ? '<div class="banner">' + esc(S.erro) + '</div>' : '') +
    '<button class="btn primary" type="submit"' + (S.ocupado ? ' disabled' : '') + '>' + I.lock + (S.ocupado ? 'Abrindo…' : 'Entrar') + '</button></form>' +
    '<div class="small">Recebeu um arquivo em vez de código? <label class="link" for="arqCliente">Abrir arquivo</label><input type="file" id="arqCliente" accept=".json" hidden></div></div>';
}
function vCliente() {
  return nav('<a class="btn ghost" href="#">Outra empresa</a>') +
    '<div class="card gate"><span class="eyebrow">Acesso do cliente · código ' + esc(S.codigo) + '</span><h1>Digite a senha</h1>' +
    '<p class="note">A apuração desta empresa está cifrada. A senha foi enviada pelo escritório.</p>' +
    '<form id="fSenha" class="row" style="flex-direction:column;align-items:stretch"><div class="field"><label for="senhaC">Senha</label><input id="senhaC" type="password" autocomplete="current-password" required autofocus></div>' +
    (S.erro ? '<div class="banner">' + esc(S.erro) + '</div>' : '') +
    '<button class="btn primary" type="submit"' + (S.ocupado ? ' disabled' : '') + '>' + I.lock + (S.ocupado ? 'Abrindo…' : 'Abrir apuração') + '</button></form></div>';
}
function vEscritorio() {
  var h = nav('<a class="btn ghost" href="#">Acesso do cliente</a>');
  h += '<header class="top"><div><span class="eyebrow">Departamento contábil · Área do escritório</span><h1>Empresas</h1><div class="sub">Rascunhos guardados neste navegador. Publique para o cliente ver.</div></div>' +
    '<div class="row"><label class="btn primary" for="arqNova">' + I.up + 'Importar XMLs de nova empresa</label><input type="file" id="arqNova" accept=".zip,.xml" multiple hidden>' +
    '<button class="btn" type="button" data-act="exemplo">Ver com notas de exemplo</button></div></header>';
  if (S.imp && S.imp.lendo) h += '<div class="banner info">Lendo ' + S.imp.arquivos + ' arquivos…</div>';
  if (S.locais.length) {
    h += '<div class="empresas">' + S.locais.map(function (e) {
      return '<button type="button" class="card emp" data-abrir="' + esc(e.id) + '"><span class="eyebrow">' + esc(fmtCnpj(e.meta.cnpj)) + '</span><h3>' + esc(e.meta.nome || 'Sem nome') + '</h3>' +
        '<span class="small">' + e.notas.length + ' notas · ' + (e.meta.publicado ? 'publicado em ' + new Date(e.meta.publicado).toLocaleDateString('pt-BR') : 'nunca publicado') + '</span>' +
        (e.sujo ? '<span><span class="pill alerta">Alterações não publicadas</span></span>' : '<span><span class="pill ok">Publicado</span></span>') + '</button>';
    }).join('') + '</div>';
  } else {
    h += '<div class="card"><div class="empty"><h2>Nenhuma empresa neste navegador</h2><p class="note">Importe os XMLs de uma empresa para começar, ou abra uma apuração já publicada para continuar de onde parou.</p></div></div>';
  }
  h += '<div class="office"><div class="card"><h2>Continuar uma apuração publicada</h2><p class="note">Abre o arquivo publicado no GitHub com a senha do cliente e traz o histórico de produtos e notas para este navegador.</p>' +
    (S.arquivoPendente ? '<form id="fRetomar" class="row"><div class="field"><label for="senR">Senha do arquivo ' + esc(S.codigo || '') + '</label><input id="senR" type="password" required></div><button class="btn primary" type="submit">' + (S.ocupado ? 'Abrindo…' : 'Abrir arquivo') + '</button></form>' :
    '<form id="fRetomar" class="row"><div class="field"><label for="codR">Código</label><input id="codR" required></div><div class="field"><label for="senR">Senha</label><input id="senR" type="password" required></div><button class="btn" type="submit">' + (S.ocupado ? 'Abrindo…' : 'Abrir') + '</button></form>') +
    '<div class="small">Ou <label class="link" for="arqRetomar">abra o arquivo .json</label> salvo no computador.<input type="file" id="arqRetomar" accept=".json" hidden></div>' +
    (S.erro ? '<div class="banner">' + esc(S.erro) + '</div>' : '') + '</div>';
  h += '<div class="card">' + vGithub() + '</div></div>';
  return h;
}
function vGithub() {
  var g = S.gh || {};
  return '<h2>Publicação no GitHub</h2><p class="note">Opcional. Com um token do GitHub, o botão Publicar envia o arquivo cifrado direto para a pasta <code>data/</code> do repositório. Sem token, o site baixa o arquivo e você sobe pelo próprio GitHub. O token fica só neste navegador.</p>' +
    '<form id="fGh" class="row"><div class="field"><label for="ghOwner">Usuário ou organização</label><input id="ghOwner" value="' + esc(g.owner || '') + '" placeholder="meu-escritorio"></div>' +
    '<div class="field"><label for="ghRepo">Repositório</label><input id="ghRepo" value="' + esc(g.repo || '') + '" placeholder="portal-fiscal"></div>' +
    '<div class="field"><label for="ghBranch">Branch</label><input id="ghBranch" value="' + esc(g.branch || 'main') + '"></div>' +
    '<div class="field" style="flex-basis:100%"><label for="ghToken">Token (fine-grained, só este repositório, permissão Contents: leitura e escrita)</label><input id="ghToken" type="password" value="' + esc(g.token || '') + '" autocomplete="off"></div>' +
    '<button class="btn" type="submit">Salvar e testar</button>' + (g.token ? '<button class="btn danger" type="button" data-act="ghLimpar">Remover token</button>' : '') + '</form>';
}

function vPainel() {
  var e = S.emp, m = e.meta;
  var nome = m.nome || nomeDe(e.notas, m.cnpj) || fmtCnpj(m.cnpj);
  var navR = S.readonly ? '<a class="btn ghost" href="#">Sair</a>' :
    '<div class="seg" role="group" aria-label="Modo"><button type="button" data-modo="cliente" aria-pressed="' + (S.modo === 'cliente') + '">Visão do cliente</button><button type="button" data-modo="escritorio" aria-pressed="' + (S.modo === 'escritorio') + '">Escritório</button></div>' +
    '<a class="btn ghost" href="#escritorio">' + I.back + 'Empresas</a>';
  var h = nav(navR);
  h += '<header class="top"><div><div class="eyebrow">' + (S.readonly ? 'Apuração e auditoria' : 'Departamento contábil · Apuração e auditoria') + '</div><h1>Visão geral</h1><div class="sub" id="subtitle"></div></div>' +
    '<div><label class="search" for="q">' + I.search + '<input id="q" type="search" placeholder="Buscar nota, fornecedor, NCM, pendência…" autocomplete="off" value="' + esc(S.q) + '"></label></div></header>';
  if (S.exemplo) h += '<div class="banner info"><span class="grow"><b>Exemplo com notas fictícias.</b> Nenhum dado real.</span><a class="btn" href="#escritorio">Fechar exemplo</a></div>';
  else if (!S.readonly && S.sujo) h += '<div class="banner"><span class="grow"><b>Alterações não publicadas.</b> O cliente ainda vê a versão anterior.</span><button class="btn primary" type="button" data-act="irPublicar">Revisar e publicar</button></div>';
  if (S.readonly && m.publicado) h += '<div class="small">Atualizado pelo escritório em ' + new Date(m.publicado).toLocaleString('pt-BR') + ' · CNPJ ' + esc(fmtCnpj(m.cnpj)) + '</div>';
  h += '<section id="office" hidden></section><section id="main" style="display:flex;flex-direction:column;gap:18px;min-width:0"></section>';
  return h;
}

/* ---------- área do escritório (dentro do painel) ---------- */
function renderOffice() {
  var el = $('office'); if (!el) return;
  el.hidden = S.readonly || S.modo !== 'escritorio';
  if (el.hidden) { el.innerHTML = ''; return; }
  var e = S.emp, m = e.meta, imp = S.imp || {};
  var mono = ((m.mono && m.mono.length) ? m.mono : F.DEFAULT_MONO).join('\n');
  var h = '<div class="office">';
  h += '<div class="card"><div><h2>Importar notas</h2><p class="note">Envie .zip ou XMLs de NF-e e NFC-e (emitidas e recebidas) e os eventos de cancelamento. As notas se somam às que já existem; uma nota repetida é substituída pela versão nova.</p></div>' +
    '<label class="drop" id="drop" for="files"><b>' + I.up + ' Arraste os arquivos aqui</b><span class="small">ou clique para escolher · .zip ou .xml</span></label><input id="files" type="file" accept=".zip,.xml" multiple hidden>';
  if (imp.lendo) h += '<div class="note">Lendo… ' + imp.arquivos + ' arquivos</div>';
  if (imp.feito) h += '<div class="stats"><div class="stat"><div class="v num">' + imp.arquivos + '</div><div class="k">arquivos lidos</div></div><div class="stat"><div class="v num">' + imp.notas + '</div><div class="k">notas da empresa</div></div><div class="stat"><div class="v num">' + imp.canc + '</div><div class="k">canceladas</div></div><div class="stat"><div class="v num">' + (imp.terceiros + imp.erros) + '</div><div class="k">ignoradas</div></div></div>';
  h += '<div class="row"><div class="field"><label for="cnpj">CNPJ do cliente</label><input id="cnpj" value="' + esc(fmtCnpj(m.cnpj)) + '" disabled></div><div class="field"><label for="nome">Razão social</label><input id="nome" value="' + esc(m.nome || '') + '"></div></div>';
  h += '<details><summary>Produtos monofásicos e data de corte</summary><div style="display:flex;flex-direction:column;gap:10px;margin-top:10px"><p class="note">Prefixos de NCM tratados como monofásicos de PIS/COFINS (Lei 10.485/2002, Anexos I e II e pneus). Lista inicial: confira com o mix do cliente. Um por linha.</p>' +
    '<div class="field"><label for="mono">NCM (prefixos)</label><textarea id="mono" spellcheck="false">' + esc(mono) + '</textarea></div>' +
    '<div class="row"><div class="field"><label for="corte">Início da tributação normal (fim da ST)</label><input id="corte" type="date" value="' + esc(m.corte || '2026-10-01') + '"></div><button class="btn" type="button" data-act="aplicarMono">Aplicar</button></div></div></details>';
  if (!S.exemplo) h += S.confirmDel ? '<div class="confirm"><span>Apagar esta empresa deste navegador? O arquivo publicado no GitHub continua lá.</span><button class="btn danger" type="button" data-act="apagarSim">Apagar</button><button class="btn" type="button" data-act="apagarNao">Cancelar</button></div>'
    : '<div><button class="btn danger" type="button" data-act="apagar">Apagar rascunho deste navegador</button></div>';
  h += '</div>';

  h += '<div class="card" id="pub"><div><h2>Publicar para o cliente</h2><p class="note">O arquivo é cifrado com a senha do cliente antes de sair deste navegador. Sem a senha, ninguém consegue ler o conteúdo no GitHub.</p></div>' +
    '<div class="field"><label for="senhaP">Senha do cliente</label><div class="row" style="flex-wrap:nowrap"><input id="senhaP" value="' + esc(e.senha || '') + '" autocomplete="off" style="flex:1;min-width:0"><button class="btn" type="button" data-act="gerarSenha">Gerar</button></div></div>' +
    '<div class="field"><label>Link do cliente (código ' + esc(e.id) + ')</label><div class="copy"><code>' + esc(linkCliente(e.id)) + '</code><button class="btn" type="button" data-act="copiarLink">Copiar</button></div></div>' +
    '<div class="row"><button class="btn primary" type="button" data-act="publicar"' + (S.publicando || S.exemplo ? ' disabled' : '') + '>' + I.lock + (S.publicando ? 'Publicando…' : (S.gh && S.gh.token ? 'Publicar no GitHub' : 'Gerar arquivo cifrado')) + '</button>' +
    '<span class="small">' + (m.publicado ? 'Última publicação: ' + new Date(m.publicado).toLocaleString('pt-BR') : 'Ainda não publicado') + '</span></div>';
  if (!(S.gh && S.gh.token)) h += '<p class="note">Sem token configurado: o site baixa <code>' + esc(e.id) + '.json</code>. No GitHub, abra a pasta <code>data</code>, clique em Add file › Upload files e envie o arquivo. Configure o token na tela Empresas para publicar com um clique.</p>';
  h += '</div></div>';
  el.innerHTML = h;
  bindDrop();
}

/* ---------- painel principal ---------- */
function semanaCard(w) {
  var t = F.somaDias(S.res.dias, w.dias), n = t.nS + t.nE;
  var pend = S.res.pend.filter(function (p) { return w.dias.indexOf(p.dt) >= 0 && p.sev !== 'info'; }).length;
  return '<button type="button" class="pcard" data-per="w:' + w.ini + '" aria-pressed="' + (S.periodo === 'w:' + w.ini) + '"><span class="t">Semana ' + w.num + '</span><span class="d num">' + br(w.ini) + ' a ' + br(w.fim) + '</span><span class="m">' + n + ' notas' + (pend ? ' · <span class="dot"></span>' + pend + ' pend.' : '') + '</span></button>';
}
function mesCard(m) {
  var t = F.somaDias(S.res.dias, m.dias);
  var pend = S.res.pend.filter(function (p) { return p.dt.slice(0, 7) === m.mes && p.sev !== 'info'; }).length;
  return '<button type="button" class="pcard" data-per="m:' + m.mes + '" aria-pressed="' + (S.periodo === 'm:' + m.mes) + '"><span class="t" style="text-transform:capitalize">' + esc(mesNome(m.mes)) + '</span><span class="d">' + m.dias.length + ' dias com notas</span><span class="m">' + (t.nS + t.nE) + ' notas' + (pend ? ' · <span class="dot"></span>' + pend + ' pend.' : '') + '</span></button>';
}
function kpi(nome, icone, d, c, extra) {
  var saldo = F.r2(d - c);
  return '<div class="card kpi"><div class="lbl"><span class="badge">' + icone + '</span>' + nome + '</div><div><div class="big num' + (saldo < 0 ? ' credor' : '') + '">' + m0(Math.abs(saldo)) + '</div><div class="state">' + (saldo >= 0 ? 'a recolher no período' : '<span class="credor">saldo credor no período</span>') + '</div></div>' +
    '<dl class="num"><dt>Débitos</dt><dd>' + m0(d) + '</dd><dt>Créditos</dt><dd>' + m0(c) + '</dd>' + (extra || '') + '</dl></div>';
}
function renderHeaderSub() {
  var sub = $('subtitle'); if (!sub) return;
  var e = S.emp, nome = e.meta.nome || nomeDe(e.notas, e.meta.cnpj) || fmtCnpj(e.meta.cnpj);
  if (!S.res) { sub.innerHTML = '<b>' + esc(nome) + '</b> · sem notas'; return; }
  var ds = diasSel(), lbl = 'Todo o período';
  if (S.periodo[0] === 'w') { var w = S.per.semanas.filter(function (x) { return 'w:' + x.ini === S.periodo; })[0]; lbl = 'Semana ' + w.num + ' de ' + mesNome(w.mes); }
  if (S.periodo[0] === 'm') lbl = mesNome(S.periodo.slice(2));
  sub.innerHTML = '<b>' + esc(nome) + '</b> · ' + esc(lbl) + (ds.length ? ' · de ' + br(ds[0]) + ' a ' + br(ds[ds.length - 1]) : '');
}

function renderMain() {
  renderHeaderSub();
  var el = $('main'); if (!el) return;
  if (!S.res) {
    el.innerHTML = '<div class="card"><div class="empty"><h2>Sem notas ainda</h2><p class="note">Importe os XMLs na área do escritório para ver a apuração e as pendências.</p>' + (S.readonly ? '' : '<button class="btn primary" type="button" data-modo="escritorio">Importar XMLs</button>') + '</div></div>';
    return;
  }
  var ds = diasSel(), T = F.somaDias(S.res.dias, ds);
  var pend = S.res.pend.filter(function (p) { return ds.indexOf(p.dt) >= 0; });
  var erros = pend.filter(function (p) { return p.sev === 'erro'; }), alertas = pend.filter(function (p) { return p.sev === 'alerta'; });
  var impacto = erros.concat(alertas).reduce(function (a, p) { return a + p.imp; }, 0);
  var eI = erros.filter(function (p) { return impDe(p) !== 'pc'; }).length, eP = erros.filter(function (p) { return impDe(p) === 'pc'; }).length;

  var h = '<div class="periods" role="group" aria-label="Período">';
  h += '<div class="pgroup"><span class="eyebrow">Período</span><div class="pcards"><button type="button" class="pcard" data-per="all" aria-pressed="' + (S.periodo === 'all') + '"><span class="t">' + (S.grupo === 'semana' ? 'Todas as semanas' : 'Todos os meses') + '</span><span class="d">' + (S.grupo === 'semana' ? S.per.semanas.length + ' semanas' : S.per.meses.length + ' meses') + '</span><span class="m"><span class="dot"></span>' + S.res.notas.length + ' notas</span></button></div></div>';
  if (S.grupo === 'semana') {
    var porMes = {}; S.per.semanas.forEach(function (w) { (porMes[w.mes] = porMes[w.mes] || []).push(w); });
    Object.keys(porMes).sort().reverse().forEach(function (m) { h += '<div class="pgroup"><span class="eyebrow">' + esc(mesNome(m)) + '</span><div class="pcards">' + porMes[m].map(semanaCard).join('') + '</div></div>'; });
  } else h += '<div class="pgroup"><span class="eyebrow">Meses</span><div class="pcards">' + S.per.meses.map(mesCard).join('') + '</div></div>';
  h += '</div>';
  h += '<div class="toolbar"><div class="seg" role="group" aria-label="Agrupar períodos"><button type="button" data-grupo="semana" aria-pressed="' + (S.grupo === 'semana') + '">Semanas</button><button type="button" data-grupo="mes" aria-pressed="' + (S.grupo === 'mes') + '">Meses</button></div><span class="small">A apuração oficial é mensal. Dia e semana servem para acompanhamento.</span></div>';

  h += '<div class="mov card"><div><span class="small">Vendas</span><b class="num">' + m0(T.vendas) + '</b><span class="small">' + T.nS + ' notas de saída</span></div>' +
    '<div><span class="small">Compras</span><b class="num">' + m0(T.compras + T.compOut) + '</b><span class="small">' + T.nE + ' notas de entrada' + (T.compOut ? ' · ' + m0(T.compOut) + ' de uso/ativo' : '') + '</span></div>' +
    '<div><span class="small">ICMS-ST pago nas compras</span><b class="num">' + m0(T.stE) + '</b><span class="small">retido pelos fornecedores</span></div></div>';
  h += '<div class="kpis">';
  h += kpi('ICMS', I.doc, T.icmsD, T.icmsC, (T.icmsUso || T.ciap) ? '<dt>Uso e ativo (sem crédito)</dt><dd>' + m0(T.icmsUso + T.ciap) + '</dd>' : '');
  h += kpi('PIS', I.pct, T.pisD, T.pisC, '<dt>Destacado nas vendas</dt><dd>' + m0(T.pisDest) + '</dd>');
  h += kpi('COFINS', I.pct, T.cofD, T.cofC, '<dt>Destacado nas vendas</dt><dd>' + m0(T.cofDest) + '</dd>');
  h += '<div class="card kpi' + (erros.length ? ' alert' : '') + '"><div class="lbl"><span class="badge">' + I.alert + '</span>Pendências</div><div><div class="big num">' + erros.length + '</div><div class="state">' + (erros.length === 1 ? 'erro' : 'erros') + ' · ' + alertas.length + ' ' + (alertas.length === 1 ? 'alerta' : 'alertas') + '</div></div>' +
    '<dl class="num"><dt>Erros de ICMS</dt><dd' + (eI ? ' class="errtxt"' : '') + '>' + eI + '</dd><dt>Erros de PIS/COFINS</dt><dd' + (eP ? ' class="errtxt"' : '') + '>' + eP + '</dd><dt>Impacto estimado</dt><dd>' + m0(impacto) + '</dd></dl></div>';
  h += '</div>';

  h += grafico(ds);

  var notasF = S.res.notas.filter(function (n) { return ds.indexOf(n.dt) >= 0 && bate(S.q, [n.n, n.ch, n.parte.n, n.parte.c]); });
  var nPend = Object.values(S.res.produtos).filter(function (p) { return p.classe === 'pendente'; }).length;
  var tabs = [['apuracao', 'Apuração', ''], ['pendencias', 'Pendências', '<span class="count' + (erros.length ? ' err' : '') + '">' + (erros.length + alertas.length) + '</span>'],
    ['notas', 'Notas', '<span class="count">' + notasF.length + '</span>'], ['produtos', 'Produtos', '<span class="count' + (nPend ? ' err' : '') + '">' + (nPend ? nPend + ' sem classe' : Object.keys(S.res.produtos).length) + '</span>'], ['reforma', 'IBS/CBS 2026', '']];
  h += '<div class="card"><div class="tabs" role="tablist">' + tabs.map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + t[1] + t[2] + '</button>'; }).join('') + '</div><div class="pbody">';
  if (S.tab === 'apuracao') h += tabApuracao(ds, T);
  else if (S.tab === 'pendencias') h += tabPendencias(pend);
  else if (S.tab === 'notas') h += tabNotas(notasF);
  else if (S.tab === 'produtos') h += tabProdutos();
  else h += tabReforma(ds, T);
  h += '</div></div>';
  h += '<p class="legal">Base: ICMS/SP com tributação normal de pneus e autopeças a partir de 01/10/2026 (Portaria SRE 34/2026, que revogou os Anexos de pneumáticos e autopeças da Portaria CAT 68/2019); PIS/COFINS não cumulativo do Lucro Real (Leis 10.637/2002 e 10.833/2003), com ICMS excluído da base do débito (Tema 69/STF) e do crédito (Lei 14.592/2023); produtos monofásicos conforme a Lei 10.485/2002, sem débito na revenda e sem crédito na compra. Valores apurados a partir dos XMLs; não substituem a escrituração (SPED) nem a apuração oficial.</p>';
  el.innerHTML = h;
  bindChart();
}

/* ---------- gráfico: ICMS débito x crédito ---------- */
function gruposGrafico(ds) {
  if (S.periodo[0] === 'w') return ds.map(function (d) { return { lbl: br(d), titulo: brFull(d), dias: [d] }; });
  return S.per.semanas.slice().reverse().map(function (w) { return { lbl: br(w.ini), titulo: 'Semana ' + w.num + ' · ' + br(w.ini) + ' a ' + br(w.fim), dias: w.dias.filter(function (d) { return ds.indexOf(d) >= 0; }) }; })
    .filter(function (g) { return g.dias.length; });
}
function escala(max) {
  if (max <= 0) return { max: 1, passo: 1 };
  var bruto = max / 4, p = Math.pow(10, Math.floor(Math.log10(bruto))), n = bruto / p;
  var passo = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  return { max: Math.ceil(max / passo) * passo, passo: passo };
}
function curto(v) { return v >= 1e6 ? (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi' : v >= 1e3 ? (v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' : v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }); }
function grafico(ds) {
  var gs = gruposGrafico(ds).map(function (g) { g.t = F.somaDias(S.res.dias, g.dias); return g; });
  S._gs = gs;
  if (!gs.length) return '';
  var max = 0; gs.forEach(function (g) { max = Math.max(max, g.t.icmsD, g.t.icmsC); });
  var larg = ($('main') && $('main').clientWidth) || 1000;
  var sc = escala(max), W = Math.max(560, Math.round(larg - 38)), H = 260, L = 56, R = 12, Tp = 12, B = 30, iw = W - L - R, ih = H - Tp - B;
  var gw = iw / gs.length, bw = Math.max(6, Math.min(26, gw * 0.3)), gap = 2;
  var y = function (v) { return Tp + ih - v / sc.max * ih; };
  var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="ICMS débito e crédito por ' + (S.periodo[0] === 'w' ? 'dia' : 'semana') + '">';
  for (var v = 0; v <= sc.max + 1e-9; v += sc.passo) s += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="axis" x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + curto(v) + '</text>';
  var barra = function (x, val, cor) {
    if (val <= 0) return '';
    var top = y(val), h = Tp + ih - top, r = Math.min(4, h, bw / 2);
    return '<path d="M' + x + ',' + (Tp + ih) + 'V' + (top + r) + 'Q' + x + ',' + top + ' ' + (x + r) + ',' + top + 'H' + (x + bw - r) + 'Q' + (x + bw) + ',' + top + ' ' + (x + bw) + ',' + (top + r) + 'V' + (Tp + ih) + 'Z" fill="' + cor + '"/>';
  };
  var passoRotulo = Math.ceil(gs.length / 12);
  gs.forEach(function (g, i) {
    var cx = L + gw * i + gw / 2, x1 = cx - bw - gap / 2, x2 = cx + gap / 2;
    s += '<rect class="hit" data-g="' + i + '" x="' + (L + gw * i) + '" y="' + Tp + '" width="' + gw + '" height="' + ih + '" rx="6"/>';
    s += barra(x1, g.t.icmsD, 'var(--s1)') + barra(x2, g.t.icmsC, 'var(--s2)');
    if (i % passoRotulo === 0) s += '<text class="axis" x="' + cx + '" y="' + (H - 10) + '" text-anchor="middle">' + esc(g.lbl) + '</text>';
  });
  s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + (Tp + ih) + '" y2="' + (Tp + ih) + '" stroke="var(--muted)" stroke-width="1"/></svg>';
  return '<div class="card chart-card"><div class="chart-head"><div><h3>ICMS por ' + (S.periodo[0] === 'w' ? 'dia' : 'semana') + '</h3><div class="small">Débito das saídas e crédito das entradas. Passe o mouse para ver o saldo.</div></div>' +
    '<div class="legend"><span><i style="background:var(--s1)"></i>Débito</span><span><i style="background:var(--s2)"></i>Crédito</span></div></div>' +
    '<div class="chart" id="chart">' + s + '<div class="tip" id="tip" hidden></div></div></div>';
}
function bindChart() {
  var box = $('chart'); if (!box) return;
  var tip = $('tip');
  box.addEventListener('mousemove', function (ev) {
    var r = ev.target.closest && ev.target.closest('.hit');
    if (!r) { tip.hidden = true; return; }
    var g = S._gs[+r.getAttribute('data-g')], t = g.t, saldo = t.icmsD - t.icmsC;
    tip.innerHTML = '<b>' + esc(g.titulo) + '</b><div class="r"><span><i style="background:var(--s1)"></i>Débito</span><span class="num">' + m0(t.icmsD) + '</span></div><div class="r"><span><i style="background:var(--s2)"></i>Crédito</span><span class="num">' + m0(t.icmsC) + '</span></div><div class="r" style="margin-top:4px;padding-top:4px;border-top:1px solid rgba(127,127,127,.4)"><span>' + (saldo >= 0 ? 'A recolher' : 'Saldo credor') + '</span><span class="num">' + m0(Math.abs(saldo)) + '</span></div>';
    tip.hidden = false;
    var b = box.getBoundingClientRect(), x = ev.clientX - b.left + box.scrollLeft + 14, yy = ev.clientY - b.top + 10;
    if (x + 190 > box.scrollWidth) x -= 210;
    tip.style.left = x + 'px'; tip.style.top = yy + 'px';
  });
  box.addEventListener('mouseleave', function () { tip.hidden = true; });
}

/* ---------- abas ---------- */
function saldoCell(v) { return '<td class="r num' + (v < -0.004 ? ' credor' : '') + '">' + (v < -0.004 ? '(' + m0(-v) + ')' : m0(v)) + '</td>'; }
function linhasApuracao(ds) {
  var rows = [];
  if (S.det === 'dia') ds.slice().reverse().forEach(function (d) { rows.push({ lbl: brFull(d), dias: [d] }); });
  else if (S.det === 'semana') S.per.semanas.forEach(function (w) { var x = w.dias.filter(function (d) { return ds.indexOf(d) >= 0; }); if (x.length) rows.push({ lbl: 'Sem. ' + w.num + ' · ' + br(w.ini) + ' a ' + br(w.fim), dias: x }); });
  else S.per.meses.forEach(function (m) { var x = m.dias.filter(function (d) { return ds.indexOf(d) >= 0; }); if (x.length) rows.push({ lbl: mesNome(m.mes), dias: x }); });
  return rows;
}
function tabApuracao(ds, T) {
  var rows = linhasApuracao(ds).map(function (r) { return { lbl: r.lbl, t: F.somaDias(S.res.dias, r.dias) }; });
  var h = '<div class="toolbar"><div class="seg" role="group" aria-label="Detalhar por"><button type="button" data-det="dia" aria-pressed="' + (S.det === 'dia') + '">Dia</button><button type="button" data-det="semana" aria-pressed="' + (S.det === 'semana') + '">Semana</button><button type="button" data-det="mes" aria-pressed="' + (S.det === 'mes') + '">Mês</button></div><span class="small">Valores entre parênteses são saldo credor.</span></div>';
  h += '<div class="tscroll"><table><thead><tr class="grp"><th></th><th></th><th></th><th colspan="3">ICMS</th><th colspan="3">PIS</th><th colspan="3">COFINS</th></tr><tr><th>Período</th><th class="r">Vendas</th><th class="r">Compras</th><th class="r">Débito</th><th class="r">Crédito</th><th class="r">Saldo</th><th class="r">Débito</th><th class="r">Crédito</th><th class="r">Saldo</th><th class="r">Débito</th><th class="r">Crédito</th><th class="r">Saldo</th></tr></thead><tbody>';
  rows.forEach(function (r) {
    var t = r.t;
    h += '<tr><td style="white-space:nowrap;text-transform:' + (S.det === 'mes' ? 'capitalize' : 'none') + '">' + esc(r.lbl) + '<div class="small">' + t.nS + ' saídas · ' + t.nE + ' entradas</div></td><td class="r num">' + m0(t.vendas) + '</td><td class="r num">' + m0(t.compras + t.compOut) + (t.compOut ? '<div class="small">uso/ativo ' + m0(t.compOut) + '</div>' : '') + '</td><td class="r num">' + m0(t.icmsD) + '</td><td class="r num">' + m0(t.icmsC) + '</td>' + saldoCell(t.icmsD - t.icmsC) + '<td class="r num">' + m0(t.pisD) + '</td><td class="r num">' + m0(t.pisC) + '</td>' + saldoCell(t.pisD - t.pisC) + '<td class="r num">' + m0(t.cofD) + '</td><td class="r num">' + m0(t.cofC) + '</td>' + saldoCell(t.cofD - t.cofC) + '</tr>';
  });
  h += '</tbody><tfoot><tr><td>Total</td><td class="r num">' + m0(T.vendas) + '</td><td class="r num">' + m0(T.compras + T.compOut) + '</td><td class="r num">' + m0(T.icmsD) + '</td><td class="r num">' + m0(T.icmsC) + '</td>' + saldoCell(T.icmsD - T.icmsC) + '<td class="r num">' + m0(T.pisD) + '</td><td class="r num">' + m0(T.pisC) + '</td>' + saldoCell(T.pisD - T.pisC) + '<td class="r num">' + m0(T.cofD) + '</td><td class="r num">' + m0(T.cofC) + '</td>' + saldoCell(T.cofD - T.cofC) + '</tr></tfoot></table></div>';
  h += '<p class="note">PIS e COFINS apurados pela regra (1,65% e 7,6% sobre a receita sem ICMS), não pelo valor destacado nas notas. Produtos monofásicos não geram débito nem crédito. Entradas de setembro com ST não geram crédito de ICMS: o imposto foi encerrado na retenção. Uso e consumo e ativo ficam fora do crédito direto (ativo segue o CIAP, 1/48 por mês).</p>';
  return h;
}

var COD_TIT = { ST_SAIDA: 'Saída ainda como ST', ALIQ_INT: 'Alíquota interna', SEM_TRIB: 'Venda sem ICMS', ALIQ_INTER: 'Alíquota interestadual', ST_INTER: 'ST interestadual', MONO_TRIB: 'PIS/COFINS em monofásico', MONO_CST: 'CST monofásico', TEMA69: 'ICMS na base do PIS/COFINS', ST_FORN: 'Fornecedor reteve ST', ST60_FORN: 'Fornecedor emitiu como ST', ALIQ_FORN: 'Alíquota do fornecedor', ALIQ_INTER_FORN: 'Alíquota interestadual do fornecedor', ST_INTER_FORN: 'ST de outra UF', MONO_FORN: 'Monofásico na compra', PROD_PEND: 'Produto sem classificação', ICMS_CALC: 'Cálculo do ICMS', DIFAL: 'DIFAL' };
var COD_IMP = { ST_SAIDA: 'icms', ALIQ_INT: 'icms', SEM_TRIB: 'icms', ALIQ_INTER: 'icms', ST_INTER: 'icms', ST_FORN: 'icms', ST60_FORN: 'icms', ALIQ_FORN: 'icms', ALIQ_INTER_FORN: 'icms', ST_INTER_FORN: 'icms', ICMS_CALC: 'icms', DIFAL: 'icms', MONO_TRIB: 'pc', MONO_CST: 'pc', TEMA69: 'pc', MONO_FORN: 'pc', PROD_PEND: 'ambos' };
var IMP_LBL = { icms: 'ICMS', pc: 'PIS/COFINS', ambos: 'ICMS e PIS/COFINS' };
function impDe(p) { return COD_IMP[p.cod] || 'ambos'; }
function impOk(p) { var i = impDe(p); return S.fImp === 'todos' || i === S.fImp || i === 'ambos'; }

function tabPendencias(pend) {
  var f = pend.filter(function (p) { return impOk(p) && (S.fQuem === 'todos' || p.quem === S.fQuem) && (S.fSev === 'todos' || p.sev === S.fSev) && bate(S.q, [p.n, p.ch, p.parte, p.ncm, p.x, p.msg, COD_TIT[p.cod]]); });
  var ord = { erro: 0, alerta: 1, info: 2 }; f.sort(function (a, b) { return ord[a.sev] - ord[b.sev] || (a.dt < b.dt ? 1 : -1); });
  var cI = function (k) { return pend.filter(function (p) { return p.sev !== 'info' && (k === 'todos' || impDe(p) === k); }).length; };
  var h = '<div class="toolbar"><div class="chips" role="group" aria-label="Imposto">' + [['todos', 'Todos os impostos'], ['icms', 'ICMS'], ['pc', 'PIS/COFINS']].map(function (c) { return '<button type="button" class="chip" data-fimp="' + c[0] + '" aria-pressed="' + (S.fImp === c[0]) + '">' + c[1] + ' <span class="num">(' + cI(c[0]) + ')</span></button>'; }).join('') + '</div></div>';
  h += '<div class="toolbar"><div class="chips" role="group" aria-label="Origem">' + [['todos', 'Todas'], ['cliente', 'Emitidas pelo cliente'], ['fornecedor', 'De fornecedores']].map(function (c) { return '<button type="button" class="chip" data-fquem="' + c[0] + '" aria-pressed="' + (S.fQuem === c[0]) + '">' + c[1] + '</button>'; }).join('') + '</div>';
  h += '<div class="chips" role="group" aria-label="Gravidade">' + [['todos', 'Todas'], ['erro', 'Erros'], ['alerta', 'Alertas'], ['info', 'Avisos']].map(function (c) { return '<button type="button" class="chip" data-fsev="' + c[0] + '" aria-pressed="' + (S.fSev === c[0]) + '">' + c[1] + '</button>'; }).join('') + '</div></div>';
  if (!f.length) return h + '<div class="empty"><span class="pill ok">Nenhuma pendência</span><p class="note">Nada encontrado para este período e filtro.</p></div>';
  h += '<div class="tscroll"><table><thead><tr><th>Gravidade</th><th>Imposto</th><th>Nota</th><th>Emitente / destinatário</th><th>Item</th><th>O que corrigir</th><th class="r">Impacto est.</th></tr></thead><tbody>';
  f.slice(0, 500).forEach(function (p) {
    h += '<tr><td><span class="pill ' + p.sev + '">' + { erro: 'Erro', alerta: 'Alerta', info: 'Aviso' }[p.sev] + '</span><div class="small">' + (p.quem === 'cliente' ? 'Cliente' : 'Fornecedor') + '</div></td><td><span class="tag">' + IMP_LBL[impDe(p)] + '</span></td><td class="num" style="white-space:nowrap">Nº ' + esc(p.n) + '<div class="small">' + brFull(p.dt) + '</div></td><td>' + esc(p.parte || 'Consumidor final') + '</td><td>' + (p.item ? esc(p.x) + '<div class="small mono">NCM ' + esc(p.ncm) + ' · item ' + p.item + '</div>' : '<span class="small">Nota inteira</span>') + '</td><td class="msg"><b>' + esc(COD_TIT[p.cod] || p.cod) + '.</b> ' + esc(p.msg) + (p.cod === 'PROD_PEND' && !S.readonly ? ' <button type="button" class="link" data-act="irProdutos">Classificar</button>' : '') + '</td><td class="r num">' + (p.imp ? m0(p.imp) : '–') + '</td></tr>';
  });
  h += '</tbody></table></div>';
  if (f.length > 500) h += '<p class="note">Mostrando 500 de ' + f.length + '. Use a busca ou os filtros.</p>';
  h += '<div><button class="btn" type="button" data-act="csv">Baixar pendências (CSV)</button></div>';
  return h;
}
function tabNotas(notas) {
  if (!notas.length) return '<div class="empty"><p class="note">Nenhuma nota neste período' + (S.q ? ' para a busca' : '') + '.</p></div>';
  var h = '<div class="tscroll"><table><thead><tr><th>Tipo</th><th>Data</th><th>Nota</th><th>Emitente / destinatário</th><th class="r">Valor</th><th class="r">ICMS</th><th class="r">PIS/COFINS</th><th>Auditoria</th></tr></thead><tbody>';
  notas.slice(0, 400).forEach(function (n) {
    var t = n.T, icms = n.dir === 'S' ? t.icmsD : t.icmsC, pc = n.dir === 'S' ? t.pisD + t.cofD : t.pisC + t.cofC;
    h += '<tr><td><span class="pill ' + n.dir + '">' + (n.dir === 'S' ? 'Saída' : 'Entrada') + '</span><div class="small">' + (n.mod === '65' ? 'NFC-e' : 'NF-e') + (n.interna ? ' · interna' : ' · interestadual') + '</div></td><td class="num">' + brFull(n.dt) + '</td><td class="num">' + esc(n.n) + '<div class="small mono" title="' + esc(n.ch) + '">' + esc(n.ch.slice(0, 4) + '…' + n.ch.slice(-8)) + '</div></td><td>' + esc(n.parte.n || 'Consumidor final') + '<div class="small">' + esc(fmtCnpj(n.parte.c)) + (n.parte.uf ? ' · ' + esc(n.parte.uf) : '') + '</div></td><td class="r num">' + m0(n.vNF) + '</td><td class="r num">' + m0(icms) + '<div class="small">' + (n.dir === 'S' ? 'débito' : 'crédito') + '</div></td><td class="r num">' + m0(pc) + '</td><td>' + (n.pior ? '<span class="pill ' + n.pior + '">' + n.nIss + ' ' + (n.nIss === 1 ? 'ponto' : 'pontos') + '</span>' : '<span class="pill ok">OK</span>') + '</td></tr>';
  });
  h += '</tbody></table></div>';
  if (notas.length > 400) h += '<p class="note">Mostrando 400 de ' + notas.length + '. Use a busca.</p>';
  return h;
}
var CLASSES = [['revenda', 'Revenda'], ['uso', 'Uso e consumo'], ['ativo', 'Ativo']];
var ORIGEM = { manual: 'Definido pelo escritório', ncm: 'Regra do NCM', sugerido: 'Sugerido pelo NCM (pneus/autopeças)', nenhum: '' };
function tabProdutos() {
  var todos = Object.values(S.res.produtos);
  var cnt = function (c) { return todos.filter(function (p) { return c === 'todos' || p.classe === c; }).length; };
  var f = todos.filter(function (p) { return (S.fProd === 'todos' || p.classe === S.fProd) && bate(S.q, [p.x, p.cp, p.ncm, p.fn, p.fc]); });
  f.sort(function (a, b) { return (a.classe === 'pendente' ? 0 : 1) - (b.classe === 'pendente' ? 0 : 1) || b.v - a.v; });
  var h = '<p class="note">Produtos comprados de fornecedores. Revenda entra no escopo de pneus e autopeças (regras de ST e de alíquota). Uso e consumo e ativo saem do crédito de ICMS e de PIS/COFINS. NCM de pneus e autopeças já vem sugerido como revenda. A classificação fica no histórico e vale para as próximas importações.</p>';
  h += '<div class="toolbar"><div class="chips" role="group" aria-label="Classificação">' + [['todos', 'Todos'], ['pendente', 'Sem classificação'], ['revenda', 'Revenda'], ['uso', 'Uso e consumo'], ['ativo', 'Ativo']].map(function (c) { return '<button type="button" class="chip" data-fprod="' + c[0] + '" aria-pressed="' + (S.fProd === c[0]) + '">' + c[1] + ' <span class="num">(' + cnt(c[0]) + ')</span></button>'; }).join('') + '</div>';
  if (!S.readonly) h += '<label class="check" for="porNcm"><input type="checkbox" id="porNcm"' + (S.porNcm ? ' checked' : '') + '> Aplicar a todos os produtos do mesmo NCM</label>';
  h += '</div>';
  if (!f.length) h += '<div class="empty"><p class="note">Nenhum produto neste filtro.</p></div>';
  else {
    h += '<div class="tscroll"><table><thead><tr><th>Produto</th><th>NCM</th><th class="r">Compras</th><th>Classificação</th></tr></thead><tbody>';
    f.slice(0, 400).forEach(function (p) {
      var ctrl = S.readonly ? (p.classe === 'pendente' ? '' : '<span class="pill ok">' + esc((CLASSES.filter(function (c) { return c[0] === p.classe; })[0] || [])[1] || p.classe) + '</span>')
        : '<div class="seg" role="group" aria-label="Classificar">' + CLASSES.map(function (c) { return '<button type="button" data-classe="' + c[0] + '" data-pk="' + esc(p.k) + '" data-ncm="' + esc(p.ncm) + '" aria-pressed="' + (p.classe === c[0] && p.origem !== 'sugerido') + '">' + c[1] + '</button>'; }).join('') + '</div>';
      var orig = p.classe === 'pendente' ? '<span class="pill alerta">Sem classificação</span>' : '<span class="small">' + esc(ORIGEM[p.origem]) + '</span>';
      var desf = !S.readonly && (p.origem === 'manual' || p.origem === 'ncm') ? ' <button type="button" class="link" data-desfazer="' + esc(p.k) + '" data-origem="' + p.origem + '" data-ncm="' + esc(p.ncm) + '">Desfazer</button>' : '';
      h += '<tr><td>' + esc(p.x) + '<div class="small">Cód. ' + esc(p.cp || '–') + ' · ' + esc(p.fn) + '</div></td><td class="mono" style="white-space:nowrap">' + esc(p.ncm) + (p.mono ? '<div><span class="tag">Monofásico</span></div>' : '') + '</td><td class="r num">' + m0(p.v) + '<div class="small">' + p.n + ' ' + (p.n === 1 ? 'compra' : 'compras') + ' · última ' + brFull(p.ult) + '</div></td><td>' + ctrl + '<div style="margin-top:5px">' + orig + desf + '</div></td></tr>';
    });
    h += '</tbody></table></div>';
  }
  if (!S.readonly && S.emp.hist.length) {
    h += '<details><summary>Histórico de classificação (' + S.emp.hist.length + ')</summary><div class="tscroll" style="margin-top:10px"><table><thead><tr><th>Quando</th><th>Alvo</th><th>Produto / NCM</th><th>De</th><th>Para</th></tr></thead><tbody>' +
      S.emp.hist.slice().reverse().slice(0, 200).map(function (x) { return '<tr><td class="num" style="white-space:nowrap">' + new Date(x.em).toLocaleString('pt-BR') + '</td><td>' + (x.alvo === 'ncm' ? 'NCM' : 'Produto') + '</td><td>' + esc(x.x || x.ref) + '</td><td>' + esc(nomeClasse(x.de)) + '</td><td>' + esc(nomeClasse(x.para)) + '</td></tr>'; }).join('') + '</tbody></table></div></details>';
  }
  return h;
}
function nomeClasse(c) { return c ? ((CLASSES.filter(function (x) { return x[0] === c; })[0] || [])[1] || c) : '—'; }
function tabReforma(ds, T) {
  var h = '<p class="note">Em 2026 a CBS (0,9%) e o IBS (0,1%) são destacados nas notas em caráter de teste. Os valores vêm do grupo IBS/CBS dos XMLs e são informativos: não alteram a apuração de ICMS, PIS e COFINS.</p>';
  h += '<div class="tscroll"><table><thead><tr><th>Mês</th><th class="r">CBS destacada</th><th class="r">IBS destacado</th><th class="r">Notas</th></tr></thead><tbody>';
  S.per.meses.forEach(function (m) { var x = m.dias.filter(function (d) { return ds.indexOf(d) >= 0; }); if (!x.length) return; var t = F.somaDias(S.res.dias, x); h += '<tr><td style="text-transform:capitalize">' + esc(mesNome(m.mes)) + '</td><td class="r num">' + m0(t.cbs) + '</td><td class="r num">' + m0(t.ibs) + '</td><td class="r num">' + (t.nS + t.nE) + '</td></tr>'; });
  h += '</tbody></table></div>';
  var emit = S.res.notas.filter(function (n) { return ds.indexOf(n.dt) >= 0 && n.dir === 'S' && n.proprio; }).length;
  if (!T.cbs && emit) h += '<div class="banner"><span class="grow">Nenhuma nota emitida no período traz o grupo IBS/CBS. Vale conferir a configuração do emissor.</span></div>';
  return h;
}

/* ---------- ações ---------- */
function csv() {
  var ds = diasSel(), pend = S.res.pend.filter(function (p) { return ds.indexOf(p.dt) >= 0; });
  var linhas = [['gravidade', 'imposto', 'origem', 'data', 'numero', 'chave', 'emitente_destinatario', 'item', 'ncm', 'descricao', 'ocorrencia', 'detalhe', 'impacto_estimado']];
  pend.forEach(function (p) { linhas.push([p.sev, IMP_LBL[impDe(p)], p.quem, brFull(p.dt), p.n, p.ch, p.parte, p.item || '', p.ncm, p.x, COD_TIT[p.cod] || p.cod, p.msg, String(p.imp).replace('.', ',')]); });
  var txt = '﻿' + linhas.map(function (l) { return l.map(function (c) { c = String(c == null ? '' : c); return /[;"\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(';'); }).join('\r\n');
  salvarArquivo('pendencias_' + S.emp.meta.cnpj + '.csv', new Blob([txt], { type: 'text/csv;charset=utf-8' }));
}

async function importarNova(files) {
  if (!files || !files.length) return;
  S.imp = { lendo: true, arquivos: 0 }; render();
  try {
    var acc = await lerArquivos(files);
    var cnpj = detectarCnpj(acc.notas);
    if (!cnpj) { S.imp = null; toast('Nenhuma NF-e válida nos arquivos.'); render(); return; }
    var exist = S.locais.filter(function (e) { return e.meta.cnpj === cnpj; })[0];
    var e = exist ? Object.assign({}, exist) : novaEmpresa(cnpj, nomeDe(acc.notas, cnpj));
    abrirEmpresa(e, false);
    integrar(acc, cnpj);
  } catch (err) { S.imp = null; toast('Não foi possível ler os arquivos.'); render(); }
}
async function importar(files) {
  if (!files || !files.length || !S.emp) return;
  S.imp = { lendo: true, arquivos: 0 }; renderOffice();
  try { integrar(await lerArquivos(files), S.emp.meta.cnpj); }
  catch (err) { S.imp = null; toast('Não foi possível ler os arquivos.'); renderOffice(); }
}
function integrar(acc, cnpj) {
  var e = S.emp, porCh = {};
  e.notas.forEach(function (n) { porCh[n.ch] = n; });
  var daEmp = 0, terceiros = 0;
  acc.notas.forEach(function (n) { if (n.eC === cnpj || n.dC === cnpj) { porCh[n.ch] = n; daEmp++; } else terceiros++; });
  e.notas = Object.keys(porCh).map(function (k) { return porCh[k]; });
  Object.assign(e.canc, acc.canc);
  if (!e.meta.nome) e.meta.nome = nomeDe(acc.notas, cnpj);
  S.imp = { feito: true, arquivos: acc.arquivos, notas: daEmp, canc: Object.keys(acc.canc).length, terceiros: terceiros, erros: acc.erros };
  S.periodo = 'all'; mudou(); recalcular(); render();
  toast(daEmp + ' notas da empresa importadas.');
}
function abrirEmpresa(e, readonly, exemplo) {
  S.emp = e; S.readonly = !!readonly; S.exemplo = !!exemplo; S.sujo = !!e.sujo && !readonly;
  S.view = 'painel'; S.periodo = 'all'; S.q = ''; S.imp = null; S.confirmDel = false;
  S.modo = readonly || exemplo ? 'cliente' : (e.notas.length ? 'cliente' : 'escritorio');
  if (location.hash && !readonly) history.replaceState(null, '', location.pathname + location.search);
  recalcular(); render(); window.scrollTo(0, 0);
}

async function abrirPublicado(codigo, senha, comoEscritorio) {
  S.ocupado = true; S.erro = ''; render();
  try {
    var r = await fetch('data/' + encodeURIComponent(codigo) + '.json', { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status === 404 ? 'codigo' : 'rede');
    var d = await C.decifrar(await r.json(), senha);
    S.ocupado = false;
    var e = deArquivo(d, comoEscritorio ? senha : '');
    if (comoEscritorio) { e.sujo = false; await C.local.gravar(Object.assign({ alterado: Date.now() }, e)); }
    abrirEmpresa(e, !comoEscritorio);
  } catch (err) {
    S.ocupado = false;
    S.erro = err.message === 'senha' ? 'Senha incorreta.' : err.message === 'codigo' ? 'Código não encontrado. Confira o código enviado pelo escritório.' : err.message === 'navegador' ? 'Este navegador não consegue abrir o arquivo. Use uma versão atual do Chrome, Edge, Firefox ou Safari.' : 'Não foi possível abrir a apuração agora. Tente de novo em instantes.';
    render();
  }
}
async function abrirArquivo(file, comoEscritorio, senha) {
  try {
    var pacote = JSON.parse(await file.text());
    S.arquivoPendente = { pacote: pacote, esc: comoEscritorio };
    if (!senha) { S.view = comoEscritorio ? 'escritorio' : 'cliente'; S.codigo = (file.name || '').replace(/\.json$/, ''); S.erro = ''; render(); toast('Digite a senha para abrir o arquivo.'); return; }
  } catch (e) { toast('Arquivo inválido.'); }
}
async function usarArquivoPendente(senha) {
  var ap = S.arquivoPendente; S.ocupado = true; render();
  try {
    var d = await C.decifrar(ap.pacote, senha);
    S.arquivoPendente = null; S.ocupado = false;
    var e = deArquivo(d, ap.esc ? senha : '');
    if (ap.esc) { e.sujo = false; await C.local.gravar(Object.assign({ alterado: Date.now() }, e)); }
    abrirEmpresa(e, !ap.esc);
  } catch (err) { S.ocupado = false; S.erro = err.message === 'senha' ? 'Senha incorreta.' : 'Não foi possível abrir o arquivo.'; render(); }
}

async function publicar() {
  var e = S.emp, senha = ($('senhaP').value || '').trim();
  var nome = $('nome') ? $('nome').value.trim() : '';
  if (nome) e.meta.nome = nome;
  if (!window.crypto || !crypto.subtle) { toast('A criptografia só funciona com o site aberto em https (como no GitHub Pages).'); return; }
  if (senha.length < 14) { toast('O arquivo fica público no GitHub, então a senha precisa ter pelo menos 14 caracteres. Use o botão Gerar.'); return; }
  e.senha = senha; S.publicando = true; renderOffice();
  try {
    var pacote = await C.cifrar(paraArquivo(e), senha);
    var texto = JSON.stringify(pacote);
    if (S.gh && S.gh.token) {
      await C.publicarGitHub(S.gh, 'data/' + e.id + '.json', texto, 'Atualiza apuração ' + (e.meta.nome || e.meta.cnpj));
      toast('Publicado no GitHub. O site atualiza em 1 a 2 minutos.');
    } else {
      await salvarArquivo(e.id + '.json', new Blob([texto], { type: 'application/json' }));
      toast('Arquivo cifrado gerado. Envie-o para a pasta data do repositório.');
    }
    e.meta.publicado = Date.now(); S.sujo = false; salvarLocal();
  } catch (err) {
    toast(/github 401|github 403/.test(err.message) ? 'O GitHub recusou o token. Confira a permissão Contents: leitura e escrita.' : /github 404/.test(err.message) ? 'Repositório não encontrado. Confira usuário e nome.' : 'Não foi possível publicar (' + err.message + ').');
  }
  S.publicando = false; render();
}

function classificar(pk, ncm, classe) {
  var e = S.emp, agora = Date.now();
  if (S.porNcm && ncm) {
    var ant = e.ncmCad[ncm]; e.ncmCad[ncm] = { c: classe, em: agora };
    e.hist.push({ em: agora, alvo: 'ncm', ref: ncm, x: 'NCM ' + ncm, de: ant ? ant.c : null, para: classe });
    Object.keys(e.prodCad).forEach(function (k) { if (e.prodCad[k].ncm === ncm) delete e.prodCad[k]; });
  } else {
    var p = S.res.produtos[pk] || {}, a = e.prodCad[pk];
    e.prodCad[pk] = { c: classe, em: agora, x: p.x || '', ncm: ncm || '' };
    e.hist.push({ em: agora, alvo: 'produto', ref: pk, x: (p.x || '') + ' · ' + (p.fn || ''), de: a ? a.c : (p.origem === 'sugerido' ? 'revenda' : null), para: classe });
  }
  mudou(); recalcular(); renderMain(); renderVBanner();
}
function desfazerClasse(pk, origem, ncm) {
  var e = S.emp, agora = Date.now();
  if (origem === 'ncm') { e.hist.push({ em: agora, alvo: 'ncm', ref: ncm, x: 'NCM ' + ncm, de: e.ncmCad[ncm] && e.ncmCad[ncm].c, para: null }); delete e.ncmCad[ncm]; }
  else { e.hist.push({ em: agora, alvo: 'produto', ref: pk, x: (e.prodCad[pk] && e.prodCad[pk].x) || pk, de: e.prodCad[pk] && e.prodCad[pk].c, para: null }); delete e.prodCad[pk]; }
  mudou(); recalcular(); renderMain(); renderVBanner();
}
function renderVBanner() { if (S.view === 'painel' && !S.readonly) { var y = window.scrollY; render(); window.scrollTo(0, y); } }

/* ---------- eventos ---------- */
document.addEventListener('click', function (ev) {
  var b = ev.target.closest('button'); if (!b) return;
  var d = b.dataset;
  if (d.per) { S.periodo = d.per; renderMain(); return; }
  if (d.grupo) { S.grupo = d.grupo; S.periodo = 'all'; renderMain(); return; }
  if (d.det) { S.det = d.det; renderMain(); return; }
  if (d.tab) { S.tab = d.tab; ls('pf.tab', S.tab); renderMain(); return; }
  if (d.fquem) { S.fQuem = d.fquem; renderMain(); return; }
  if (d.fsev) { S.fSev = d.fsev; renderMain(); return; }
  if (d.fimp) { S.fImp = d.fimp; renderMain(); return; }
  if (d.fprod) { S.fProd = d.fprod; renderMain(); return; }
  if (d.modo) { S.modo = d.modo; render(); return; }
  if (d.classe) { if (!S.readonly) classificar(d.pk, d.ncm, d.classe); return; }
  if (d.desfazer) { desfazerClasse(d.desfazer, d.origem, d.ncm); return; }
  if (d.abrir) { var e = S.locais.filter(function (x) { return x.id === d.abrir; })[0]; if (e) abrirEmpresa(JSON.parse(JSON.stringify(e)), false); return; }
  var a = d.act;
  if (a === 'exemplo') carregarExemplo();
  else if (a === 'csv') csv();
  else if (a === 'publicar') publicar();
  else if (a === 'irPublicar') { S.modo = 'escritorio'; render(); var p = $('pub'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  else if (a === 'irProdutos') { S.tab = 'produtos'; S.fProd = 'pendente'; renderMain(); }
  else if (a === 'gerarSenha') { $('senhaP').value = C.gerarSenha(); }
  else if (a === 'copiarLink') { var t = linkCliente(S.emp.id); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast('Link copiado.'); }).catch(function () { toast('Copie o link manualmente.'); }); }
  else if (a === 'aplicarMono') {
    S.emp.meta.mono = $('mono').value.split(/\s+/).map(function (s) { return s.replace(/\D/g, ''); }).filter(Boolean);
    S.emp.meta.corte = $('corte').value || '2026-10-01'; mudou(); recalcular(); render();
    toast(S.emp.meta.mono.length ? 'Análise recalculada.' : 'Lista vazia: a análise usa a lista padrão de pneus e autopeças.');
  }
  else if (a === 'apagar') { S.confirmDel = true; renderOffice(); }
  else if (a === 'apagarNao') { S.confirmDel = false; renderOffice(); }
  else if (a === 'apagarSim') { C.local.apagar(S.emp.id).then(function () { toast('Rascunho apagado deste navegador.'); location.hash = 'escritorio'; S.view = 'escritorio'; carregarLocais(); }); }
  else if (a === 'ghLimpar') { S.gh = Object.assign({}, S.gh, { token: '' }); ls('pf.github', JSON.stringify(S.gh)); render(); toast('Token removido deste navegador.'); }
});
document.addEventListener('submit', function (ev) {
  ev.preventDefault();
  var f = ev.target;
  if (f.id === 'fCodigo') abrirPublicado($('codigo').value.trim().toLowerCase(), $('senhaC').value);
  else if (f.id === 'fSenha') { if (S.arquivoPendente) usarArquivoPendente($('senhaC').value); else abrirPublicado(S.codigo, $('senhaC').value); }
  else if (f.id === 'fRetomar') { if (S.arquivoPendente) usarArquivoPendente($('senR').value); else abrirPublicado($('codR').value.trim().toLowerCase(), $('senR').value, true); }
  else if (f.id === 'fGh') {
    var g = { owner: $('ghOwner').value.trim(), repo: $('ghRepo').value.trim(), branch: $('ghBranch').value.trim() || 'main', token: $('ghToken').value.trim() };
    S.gh = g; ls('pf.github', JSON.stringify(g));
    if (!g.token) { toast('Configuração salva sem token.'); return; }
    C.testarGitHub(g).then(function () { toast('Conexão com o GitHub confirmada.'); }).catch(function (e) { toast('Falhou: ' + e.message + '. Confira usuário, repositório e token.'); });
  }
});
document.addEventListener('input', function (ev) { if (ev.target.id === 'q') { S.q = ev.target.value.trim(); renderMain(); } });
document.addEventListener('change', function (ev) {
  var t = ev.target;
  if (t.id === 'porNcm') { S.porNcm = t.checked; return; }
  var lista = t.files ? Array.prototype.slice.call(t.files) : [];
  if (t.id === 'files') { importar(lista); t.value = ''; }
  else if (t.id === 'arqNova') { importarNova(lista); t.value = ''; }
  else if (t.id === 'arqCliente') { if (lista[0]) abrirArquivo(lista[0], false); t.value = ''; }
  else if (t.id === 'arqRetomar') { if (lista[0]) abrirArquivo(lista[0], true); t.value = ''; }
  else if (t.id === 'nome' && S.emp) { S.emp.meta.nome = t.value.trim(); mudou(); }
});
function bindDrop() {
  var d = $('drop'); if (!d) return;
  d.addEventListener('dragover', function (e) { e.preventDefault(); d.classList.add('over'); });
  d.addEventListener('dragleave', function () { d.classList.remove('over'); });
  d.addEventListener('drop', function (e) { e.preventDefault(); d.classList.remove('over'); importar(Array.prototype.slice.call(e.dataTransfer.files)); });
}

async function carregarExemplo() {
  try {
    var blob;
    if (window.EXEMPLO_B64) { var bin = atob(window.EXEMPLO_B64), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); blob = new Blob([u]); }
    else { var r = await fetch(EXEMPLO_URL); if (!r.ok) throw new Error(); blob = await r.blob(); }
    var acc = await lerArquivos([new File([blob], 'exemplo.zip')]);
    var e = novaEmpresa('12345678000190', 'Pneus e Peças Exemplo Ltda (fictícia)');
    e.notas = acc.notas; e.canc = acc.canc; e.id = 'exemplo';
    abrirEmpresa(e, false, true);
  } catch (err) { toast('Não foi possível carregar o exemplo.'); }
}

/* ---------- início ---------- */
var tab = ls('pf.tab'); if (tab) S.tab = tab;
window.addEventListener('hashchange', rota);
rota();
})();
