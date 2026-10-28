/* ===== Portal Fiscal — interface (GitHub Pages + Supabase) ===== */
(function () {
'use strict';
var F = Fiscal, B = Banco, M = F.money;
var MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
var EXEMPLO_URL = 'exemplos/notas-exemplo.zip';

var S = {
  view: 'carregando',      // carregando | login | recuperar | escritorio | cliente | painel
  usuario: null,           // {id, email, papel}
  empresas: [], contagens: {},
  emp: null,               // {id, meta, notas, pub, canc, prodCad, ncmCad, hist}
  readonly: true, exemplo: false, modo: 'cliente',
  res: null, per: null, acessos: null,
  periodo: 'all', grupo: 'semana', tab: 'apuracao', det: 'semana',
  q: '', fQuem: 'todos', fSev: 'todos', fImp: 'todos', fProd: 'todos', porNcm: false,
  imp: null, confirmDel: false, ocupado: false, erro: '', aviso: '', telaLogin: 'entrar'
};
/* ---------- utilidades ---------- */
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function br(d) { if (!d) return ''; var p = d.split('-'); return p[2] + '/' + p[1]; }
function brFull(d) { if (!d) return ''; var p = d.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
function mesNome(m) { var p = m.split('-'); return MESES[+p[1] - 1] + '/' + p[0]; }
function fmtCnpj(c) { c = String(c || '').replace(/\D/g, ''); return c.length === 14 ? c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : c.length === 11 ? c.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : c; }
function m0(v) { if (Math.abs(v) < 0.005) v = 0; return v < 0 ? '−' + M(-v) : M(v); }
function toast(t) { var el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(function () { el.hidden = true; }, 3800); }
function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
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
  var c = {}; notas.forEach(function (n) { (n.env || [n.eC, n.dC]).forEach(function (x) { if (x && x.length === 14) c[x] = (c[x] || 0) + 1; }); });
  var best = null; Object.keys(c).forEach(function (k) { if (!best || c[k] > c[best]) best = k; }); return best;
}
function envolve(n, cnpj) { return (n.env || [n.eC, n.dC]).indexOf(cnpj) >= 0; }
function docs(t) { return t.nS + t.nE + t.nSP + t.nST + t.nCT + t.nCX; }
function nomeDe(notas, cnpj) { for (var i = 0; i < notas.length; i++) { if (notas[i].eC === cnpj) return notas[i].eN; if (notas[i].dC === cnpj) return notas[i].dN; } return ''; }

/* ---------- espaço de trabalho ---------- */
function montarEmpresa(e, d) {
  var canc = {}; d.canc.forEach(function (c) { canc[c.chave] = 1; });
  var prodCad = {}; d.produtos.forEach(function (p) { prodCad[p.chave_produto] = { c: p.classe, ncm: p.ncm, x: p.descricao, em: p.atualizado_em }; });
  var ncmCad = {}; d.ncm.forEach(function (r) { ncmCad[r.ncm_prefixo] = { c: r.classe, em: r.atualizado_em }; });
  var pub = {}; d.notas.forEach(function (n) { pub[n.chave] = n.publicada; });
  return { id: e.cnpj, meta: metaDe(e), notas: d.notas.map(function (n) { return n.dados; }), pub: pub, canc: canc, prodCad: prodCad, ncmCad: ncmCad,
    hist: d.hist.map(function (h) { return { em: h.alterado_em, alvo: h.alvo, ref: h.referencia, x: h.descricao, de: h.classe_anterior, para: h.classe_nova }; }).reverse() };
}
function metaDe(e) { return { cnpj: e.cnpj, nome: e.razao_social, corte: e.corte_st, mono: e.ncm_monofasico || [], publicado: e.publicado_em ? new Date(e.publicado_em).getTime() : null }; }
function pendentesPublicar() { if (!S.emp || S.exemplo) return 0; var n = 0; for (var k in S.emp.pub) if (!S.emp.pub[k]) n++; return n; }

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
function erroTexto(e) {
  var m = (e && (e.message || e.error_description)) || String(e);
  if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
  if (/Email not confirmed/i.test(m)) return 'Confirme seu e-mail antes de entrar. Procure a mensagem de confirmação na sua caixa de entrada.';
  if (/Password should be at least/i.test(m)) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (/Signups not allowed|signup.*disabled/i.test(m)) return 'O cadastro é feito pelo escritório. Peça ao escritório para liberar o seu acesso.';
  if (/rate limit|too many/i.test(m)) return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.';
  if (/sem permissão|row-level security|permission denied/i.test(m)) return 'Seu usuário não tem permissão para isso.';
  if (/usuário não encontrado/i.test(m)) return 'Não encontramos esse e-mail cadastrado.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
  return m;
}

/* ---------- início e sessão ---------- */
async function iniciar() {
  if (S.view === 'recuperar') { render(); return; }
  try {
    var p = await B.perfil();
    if (!p) { S.usuario = null; S.view = S.view === 'recuperar' ? 'recuperar' : 'login'; render(); return; }
    S.usuario = p;
    S.empresas = await B.empresas();
    if (p.papel === 'escritorio') { S.view = 'escritorio'; render(); contarTudo(); }
    else if (S.empresas.length === 1) await abrirDoBanco(S.empresas[0].cnpj, true);
    else { S.view = 'cliente'; render(); }
  } catch (e) { S.view = 'login'; S.erro = erroTexto(e); render(); }
}
async function contarTudo() {
  for (var i = 0; i < S.empresas.length; i++) {
    var c = S.empresas[i].cnpj;
    try { S.contagens[c] = await B.contarNotas(c); } catch (e) {}
  }
  if (S.view === 'escritorio') render();
}
async function abrirDoBanco(cnpj, readonly) {
  S.ocupado = true; S.view = S.view === 'painel' ? 'painel' : S.view; render();
  try {
    var e = S.empresas.filter(function (x) { return x.cnpj === cnpj; })[0];
    var d = await B.carregar(cnpj, !readonly);
    abrirEmpresa(montarEmpresa(e, d), readonly, false);
    if (!readonly) carregarAcessos();
  } catch (err) { toast('Não foi possível abrir a empresa: ' + erroTexto(err)); }
  S.ocupado = false; render();
}
async function carregarAcessos() {
  if (!S.emp || S.readonly || S.exemplo) return;
  try { S.acessos = await B.acessos(S.emp.id); } catch (e) { S.acessos = []; }
  renderOffice();
}
function abrirEmpresa(e, readonly, exemplo) {
  S.emp = e; S.readonly = !!readonly; S.exemplo = !!exemplo; S.acessos = null;
  S.view = 'painel'; S.periodo = 'all'; S.q = ''; S.imp = null; S.confirmDel = false;
  S.modo = readonly || exemplo ? 'cliente' : (e.notas.length ? 'cliente' : 'escritorio');
  recalcular(); render(); window.scrollTo(0, 0);
}
function voltarEmpresas() {
  S.emp = null; S.res = null; S.exemplo = false;
  S.view = S.usuario && S.usuario.papel === 'escritorio' ? 'escritorio' : 'cliente';
  render(); if (S.view === 'escritorio') B.empresas().then(function (l) { S.empresas = l; contarTudo(); });
}

/* ---------- render geral ---------- */
function render() {
  var app = $('app');
  if (S.view === 'carregando') app.innerHTML = '<div class="empty"><h2>Carregando…</h2></div>';
  else if (S.view === 'login') app.innerHTML = vLogin();
  else if (S.view === 'recuperar') app.innerHTML = vRecuperar();
  else if (S.view === 'escritorio') app.innerHTML = vEscritorio();
  else if (S.view === 'cliente') app.innerHTML = vListaCliente();
  else { app.innerHTML = vPainel(); renderOffice(); renderMain(); }
}
function nav(extra) {
  var quem = S.usuario ? '<span class="small">' + esc(S.usuario.email) + '</span><button class="btn ghost" type="button" data-act="sair">Sair</button>' : '';
  return '<nav class="nav"><button type="button" class="brand" data-act="inicio" style="border:0;background:none;cursor:pointer;font:inherit"><span class="mk">' + I.mark + '</span>Portal Fiscal</button><div class="nav-r">' + (extra || '') + quem + '</div></nav>';
}

function vLogin() {
  var criar = S.telaLogin === 'criar', esq = S.telaLogin === 'esqueci';
  var h = nav() + '<div class="card gate"><span class="eyebrow">' + (criar ? 'Primeiro acesso' : esq ? 'Recuperar acesso' : 'Acesso') + '</span><h1>' + (criar ? 'Criar conta' : esq ? 'Esqueci a senha' : 'Entrar') + '</h1>';
  h += '<p class="note">' + (criar ? 'Cadastre seu e-mail e uma senha. O escritório libera o acesso à sua empresa depois.' : esq ? 'Enviaremos um link para você definir uma nova senha.' : 'Apuração de ICMS, PIS e COFINS e auditoria das notas fiscais.') + '</p>';
  h += '<form id="fLogin" class="row" style="flex-direction:column;align-items:stretch"><div class="field"><label for="email">E-mail</label><input id="email" type="email" autocomplete="username" required value="' + esc(S.emailDigitado || '') + '"></div>';
  if (!esq) h += '<div class="field"><label for="senha">Senha</label><input id="senha" type="password" autocomplete="' + (criar ? 'new-password' : 'current-password') + '" minlength="8" required></div>';
  if (S.erro) h += '<div class="banner">' + esc(S.erro) + '</div>';
  if (S.aviso) h += '<div class="banner ok">' + esc(S.aviso) + '</div>';
  h += '<button class="btn primary" type="submit"' + (S.ocupado ? ' disabled' : '') + '>' + I.lock + (S.ocupado ? 'Aguarde…' : criar ? 'Criar conta' : esq ? 'Enviar link' : 'Entrar') + '</button></form>';
  h += '<div class="row small" style="justify-content:space-between">' + (S.telaLogin !== 'entrar' ? '<button class="link" type="button" data-login="entrar">Já tenho conta</button>' : '<button class="link" type="button" data-login="esqueci">Esqueci a senha</button><span>Sem acesso? Fale com o escritório.</span>') + '</div>';
  h += '<div class="small">Quer conhecer antes? <button class="link" type="button" data-act="exemplo">Ver com notas de exemplo</button></div></div>';
  return h;
}
function vRecuperar() {
  return nav() + '<div class="card gate"><span class="eyebrow">Recuperar acesso</span><h1>Nova senha</h1><p class="note">Defina a nova senha da sua conta.</p>' +
    '<form id="fNovaSenha" class="row" style="flex-direction:column;align-items:stretch"><div class="field"><label for="senhaN">Nova senha</label><input id="senhaN" type="password" autocomplete="new-password" minlength="8" required></div>' +
    (S.erro ? '<div class="banner">' + esc(S.erro) + '</div>' : '') + '<button class="btn primary" type="submit">Salvar nova senha</button></form></div>';
}
function vListaCliente() {
  var h = nav() + '<header class="top"><div><span class="eyebrow">Apuração e auditoria</span><h1>Suas empresas</h1></div></header>';
  if (!S.empresas.length) return h + '<div class="card"><div class="empty"><h2>Acesso ainda não liberado</h2><p class="note">Sua conta foi criada, mas o escritório ainda não vinculou nenhuma empresa a ela. Avise o escritório com o e-mail ' + esc(S.usuario.email) + '.</p></div></div>';
  return h + '<div class="empresas">' + S.empresas.map(function (e) { return '<button type="button" class="card emp" data-abrir="' + esc(e.cnpj) + '"><span class="eyebrow">' + esc(fmtCnpj(e.cnpj)) + '</span><h3>' + esc(e.razao_social || 'Empresa') + '</h3><span class="small">' + (e.publicado_em ? 'Atualizado em ' + new Date(e.publicado_em).toLocaleDateString('pt-BR') : 'Aguardando a primeira publicação') + '</span></button>'; }).join('') + '</div>';
}
function vEscritorio() {
  var h = nav();
  h += '<header class="top"><div><span class="eyebrow">Departamento contábil · Área do escritório</span><h1>Empresas</h1><div class="sub">Os dados ficam no banco do escritório. O cliente vê o que foi publicado.</div></div>' +
    '<div class="row"><label class="btn primary" for="arqNova">' + I.up + 'Importar XMLs de nova empresa</label><input type="file" id="arqNova" accept=".zip,.xml" multiple hidden>' +
    '<button class="btn" type="button" data-act="exemplo">Ver com notas de exemplo</button></div></header>';
  if (S.imp && (S.imp.lendo || S.imp.gravando)) h += '<div class="banner info">' + (S.imp.gravando ? 'Gravando notas no banco… ' + S.imp.gravadas + ' de ' + S.imp.total : 'Lendo ' + S.imp.arquivos + ' arquivos…') + '</div>';
  if (S.empresas.length) {
    h += '<div class="empresas">' + S.empresas.map(function (e) {
      var c = S.contagens[e.cnpj];
      return '<button type="button" class="card emp" data-abrir="' + esc(e.cnpj) + '"><span class="eyebrow">' + esc(fmtCnpj(e.cnpj)) + '</span><h3>' + esc(e.razao_social || 'Sem nome') + '</h3>' +
        '<span class="small">' + (c ? c.total + ' notas · ' : '') + (e.publicado_em ? 'publicado em ' + new Date(e.publicado_em).toLocaleDateString('pt-BR') : 'nunca publicado') + '</span>' +
        (c ? (c.pendentes ? '<span><span class="pill alerta">' + c.pendentes + ' notas não publicadas</span></span>' : '<span><span class="pill ok">Publicado</span></span>') : '') + '</button>';
    }).join('') + '</div>';
  } else h += '<div class="card"><div class="empty"><h2>Nenhuma empresa cadastrada</h2><p class="note">Importe os XMLs de uma empresa para começar. O CNPJ é detectado pelas notas.</p></div></div>';
  return h;
}
function vPainel() {
  var e = S.emp, m = e.meta;
  var navR = S.readonly ? (S.empresas.length > 1 ? '<button class="btn ghost" type="button" data-act="voltar">' + I.back + 'Empresas</button>' : '') :
    '<div class="seg" role="group" aria-label="Modo"><button type="button" data-modo="cliente" aria-pressed="' + (S.modo === 'cliente') + '">Visão do cliente</button><button type="button" data-modo="escritorio" aria-pressed="' + (S.modo === 'escritorio') + '">Escritório</button></div>' +
    '<button class="btn ghost" type="button" data-act="voltar">' + I.back + 'Empresas</button>';
  if (S.exemplo && !S.usuario) navR = '<button class="btn ghost" type="button" data-act="voltar">' + I.back + 'Entrar</button>';
  var h = nav(navR);
  h += '<header class="top"><div><div class="eyebrow">' + (S.readonly ? 'Apuração e auditoria' : 'Departamento contábil · Apuração e auditoria') + '</div><h1>Visão geral</h1><div class="sub" id="subtitle"></div></div>' +
    '<div><label class="search" for="q">' + I.search + '<input id="q" type="search" placeholder="Buscar nota, fornecedor, NCM, pendência…" autocomplete="off" value="' + esc(S.q) + '"></label></div></header>';
  var pend = pendentesPublicar();
  if (S.exemplo) h += '<div class="banner info"><span class="grow"><b>Exemplo com notas fictícias.</b> Nada aqui é gravado no banco.</span><button class="btn" type="button" data-act="voltar">Fechar exemplo</button></div>';
  else if (!S.readonly && pend) h += '<div class="banner"><span class="grow"><b>' + pend + (pend === 1 ? ' nota não publicada.' : ' notas não publicadas.') + '</b> O cliente ainda não vê essas notas.</span><button class="btn primary" type="button" data-act="publicar"' + (S.ocupado ? ' disabled' : '') + '>' + (S.ocupado ? 'Publicando…' : 'Publicar para o cliente') + '</button></div>';
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
  h += '<div class="card"><div><h2>Importar notas</h2><p class="note">Envie .zip ou XMLs de NF-e, NFC-e, CT-e e NFS-e (emitidas e recebidas) e os eventos de cancelamento. As notas vão para o banco e se somam às que já existem; uma nota repetida é substituída pela versão nova.</p></div>' +
    '<label class="drop" id="drop" for="files"><b>' + I.up + ' Arraste os arquivos aqui</b><span class="small">ou clique para escolher · .zip ou .xml</span></label><input id="files" type="file" accept=".zip,.xml" multiple hidden>';
  if (imp.lendo) h += '<div class="note">Lendo… ' + imp.arquivos + ' arquivos</div>';
  if (imp.gravando) h += '<div class="note">Gravando no banco… ' + imp.gravadas + ' de ' + imp.total + ' notas</div>';
  if (imp.feito) h += '<div class="stats"><div class="stat"><div class="v num">' + imp.arquivos + '</div><div class="k">arquivos lidos</div></div><div class="stat"><div class="v num">' + imp.notas + '</div><div class="k">notas da empresa</div></div><div class="stat"><div class="v num">' + imp.canc + '</div><div class="k">canceladas</div></div><div class="stat"><div class="v num">' + (imp.terceiros + imp.erros) + '</div><div class="k">ignoradas</div></div></div>';
  h += '<div class="row"><div class="field"><label for="cnpj">CNPJ do cliente</label><input id="cnpj" value="' + esc(fmtCnpj(m.cnpj)) + '" disabled></div><div class="field"><label for="nome">Razão social</label><input id="nome" value="' + esc(m.nome || '') + '"' + (S.exemplo ? ' disabled' : '') + '></div></div>';
  h += '<details><summary>Produtos monofásicos e data de corte</summary><div style="display:flex;flex-direction:column;gap:10px;margin-top:10px"><p class="note">Prefixos de NCM tratados como monofásicos de PIS/COFINS (Lei 10.485/2002, Anexos I e II e pneus). Lista inicial: confira com o mix do cliente. Um por linha.</p>' +
    '<div class="field"><label for="mono">NCM (prefixos)</label><textarea id="mono" spellcheck="false">' + esc(mono) + '</textarea></div>' +
    '<div class="row"><div class="field"><label for="corte">Início da tributação normal (fim da ST)</label><input id="corte" type="date" value="' + esc(m.corte || '2026-10-01') + '"></div><button class="btn" type="button" data-act="aplicarMono">Salvar e recalcular</button></div></div></details>';
  if (!S.exemplo) h += S.confirmDel ? '<div class="confirm"><span>Apagar a empresa e todas as notas, produtos e acessos dela? Não dá para desfazer.</span><button class="btn danger" type="button" data-act="apagarSim">Apagar definitivamente</button><button class="btn" type="button" data-act="apagarNao">Cancelar</button></div>'
    : '<div><button class="btn danger" type="button" data-act="apagar">Apagar empresa</button></div>';
  h += '</div>';

  var pend = pendentesPublicar();
  h += '<div class="card" id="pub"><div><h2>Publicar para o cliente</h2><p class="note">O cliente só vê as notas publicadas. A classificação de produtos e os ajustes de monofásicos valem na hora.</p></div>' +
    '<div class="row"><button class="btn primary" type="button" data-act="publicar"' + (S.ocupado || S.exemplo || !pend ? ' disabled' : '') + '>' + I.lock + (S.ocupado ? 'Publicando…' : pend ? 'Publicar ' + pend + (pend === 1 ? ' nota' : ' notas') : 'Tudo publicado') + '</button>' +
    '<span class="small">' + (m.publicado ? 'Última publicação: ' + new Date(m.publicado).toLocaleString('pt-BR') : 'Ainda não publicado') + '</span></div>';
  h += '<div><h3>Acessos do cliente</h3><p class="note" style="margin-top:4px">Quem entra com estes e-mails vê só esta empresa.</p></div>';
  if (S.exemplo) h += '<p class="note">Indisponível no exemplo.</p>';
  else {
    if (S.acessos === null) h += '<p class="small">Carregando…</p>';
    else if (!S.acessos.length) h += '<p class="small">Nenhum acesso cadastrado.</p>';
    else h += '<div class="tscroll"><table><tbody>' + S.acessos.map(function (a) { return '<tr><td>' + esc(a.email) + '<div class="small">' + (a.confirmado ? (a.ultimo_acesso ? 'último acesso ' + new Date(a.ultimo_acesso).toLocaleDateString('pt-BR') : 'nunca entrou') : 'aguardando confirmar o e-mail') + '</div></td><td class="r"><button class="link" type="button" data-remover="' + esc(a.user_id) + '">Remover</button></td></tr>'; }).join('') + '</tbody></table></div>';
    h += '<form id="fAcesso" class="row"><div class="field"><label for="acEmail">E-mail do cliente</label><input id="acEmail" type="email" required autocomplete="off"></div><div class="field"><label for="acSenha">Senha inicial</label><input id="acSenha" type="text" minlength="8" required autocomplete="off"></div><button class="btn" type="submit">Liberar acesso</button></form>';
    h += '<p class="note">Se o e-mail ainda não tem conta, ela é criada já pronta para entrar com essa senha. Se já tem conta, só o acesso a esta empresa é liberado e a senha dele não muda. Envie a senha ao cliente por um canal diferente do e-mail e peça para trocá-la em "Esqueci a senha".</p>';
  }
  h += '</div></div>';
  el.innerHTML = h;
  bindDrop();
}

/* ---------- painel principal ---------- */
function semanaCard(w) {
  var t = F.somaDias(S.res.dias, w.dias), n = docs(t);
  var pend = S.res.pend.filter(function (p) { return w.dias.indexOf(p.dt) >= 0 && p.sev !== 'info'; }).length;
  return '<button type="button" class="pcard" data-per="w:' + w.ini + '" aria-pressed="' + (S.periodo === 'w:' + w.ini) + '"><span class="t">Semana ' + w.num + '</span><span class="d num">' + br(w.ini) + ' a ' + br(w.fim) + '</span><span class="m">' + n + ' docs' + (pend ? ' · <span class="dot"></span>' + pend + ' pend.' : '') + '</span></button>';
}
function mesCard(m) {
  var t = F.somaDias(S.res.dias, m.dias);
  var pend = S.res.pend.filter(function (p) { return p.dt.slice(0, 7) === m.mes && p.sev !== 'info'; }).length;
  return '<button type="button" class="pcard" data-per="m:' + m.mes + '" aria-pressed="' + (S.periodo === 'm:' + m.mes) + '"><span class="t" style="text-transform:capitalize">' + esc(mesNome(m.mes)) + '</span><span class="d">' + m.dias.length + ' dias com notas</span><span class="m">' + docs(t) + ' docs' + (pend ? ' · <span class="dot"></span>' + pend + ' pend.' : '') + '</span></button>';
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
  var eI = erros.filter(function (p) { return impDe(p) === 'icms' || impDe(p) === 'ambos'; }).length, eP = erros.filter(function (p) { return impDe(p) === 'pc'; }).length, eS = erros.filter(function (p) { return impDe(p) === 'iss'; }).length;

  var h = '<div class="periods" role="group" aria-label="Período">';
  h += '<div class="pgroup"><span class="eyebrow">Período</span><div class="pcards"><button type="button" class="pcard" data-per="all" aria-pressed="' + (S.periodo === 'all') + '"><span class="t">' + (S.grupo === 'semana' ? 'Todas as semanas' : 'Todos os meses') + '</span><span class="d">' + (S.grupo === 'semana' ? S.per.semanas.length + ' semanas' : S.per.meses.length + ' meses') + '</span><span class="m"><span class="dot"></span>' + S.res.notas.length + ' notas</span></button></div></div>';
  if (S.grupo === 'semana') {
    var porMes = {}; S.per.semanas.forEach(function (w) { (porMes[w.mes] = porMes[w.mes] || []).push(w); });
    Object.keys(porMes).sort().reverse().forEach(function (m) { h += '<div class="pgroup"><span class="eyebrow">' + esc(mesNome(m)) + '</span><div class="pcards">' + porMes[m].map(semanaCard).join('') + '</div></div>'; });
  } else h += '<div class="pgroup"><span class="eyebrow">Meses</span><div class="pcards">' + S.per.meses.map(mesCard).join('') + '</div></div>';
  h += '</div>';
  h += '<div class="toolbar"><div class="seg" role="group" aria-label="Agrupar períodos"><button type="button" data-grupo="semana" aria-pressed="' + (S.grupo === 'semana') + '">Semanas</button><button type="button" data-grupo="mes" aria-pressed="' + (S.grupo === 'mes') + '">Meses</button></div><span class="small">A apuração oficial é mensal. Dia e semana servem para acompanhamento.</span></div>';

  h += '<div class="mov card"><div><span class="small">Vendas</span><b class="num">' + m0(T.vendas) + '</b><span class="small">' + T.nS + ' notas de saída</span></div>' +
    '<div><span class="small">Serviços prestados</span><b class="num">' + m0(T.servPrest) + '</b><span class="small">' + T.nSP + ' NFS-e · ISS a recolher ' + m0(T.issDev) + '</span></div>' +
    '<div><span class="small">Compras</span><b class="num">' + m0(T.compras + T.compOut + T.compIns) + '</b><span class="small">' + T.nE + ' notas de entrada' + (T.stE ? ' · ST pago ' + m0(T.stE) : '') + (T.compIns ? ' · ' + m0(T.compIns) + ' de insumo' : '') + (T.compOut ? ' · ' + m0(T.compOut) + ' de uso/ativo' : '') + '</span></div>' +
    '<div><span class="small">Serviços e fretes tomados</span><b class="num">' + m0(T.servTom + T.freteTom) + '</b><span class="small">' + T.nST + ' NFS-e · ' + T.nCT + ' CT-e' + (T.nCX ? ' · ' + T.nCX + ' CT-e sem ser tomadora' : '') + '</span></div></div>';
  h += '<div class="kpis">';
  h += kpi('ICMS', I.doc, T.icmsD, T.icmsC, (T.icmsUso || T.ciap) ? '<dt>Uso, insumo e ativo (sem crédito)</dt><dd>' + m0(T.icmsUso + T.ciap) + '</dd>' : '');
  h += kpi('PIS', I.pct, T.pisD, T.pisC, '<dt>Destacado nas vendas</dt><dd>' + m0(T.pisDest) + '</dd>');
  h += kpi('COFINS', I.pct, T.cofD, T.cofC, '<dt>Destacado nas vendas</dt><dd>' + m0(T.cofDest) + '</dd>');
  h += '<div class="card kpi' + (erros.length ? ' alert' : '') + '"><div class="lbl"><span class="badge">' + I.alert + '</span>Pendências</div><div><div class="big num">' + erros.length + '</div><div class="state">' + (erros.length === 1 ? 'erro' : 'erros') + ' · ' + alertas.length + ' ' + (alertas.length === 1 ? 'alerta' : 'alertas') + '</div></div>' +
    '<dl class="num"><dt>Erros de ICMS</dt><dd' + (eI ? ' class="errtxt"' : '') + '>' + eI + '</dd><dt>Erros de PIS/COFINS</dt><dd' + (eP ? ' class="errtxt"' : '') + '>' + eP + '</dd>' + (eS ? '<dt>Erros de ISS</dt><dd class="errtxt">' + eS + '</dd>' : '') + '<dt>Impacto estimado</dt><dd>' + m0(impacto) + '</dd></dl></div>';
  h += '</div>';

  h += grafico(ds);

  var notasF = S.res.notas.filter(function (n) { return ds.indexOf(n.dt) >= 0 && bate(S.q, [n.n, n.ch, n.parte.n, n.parte.c]); });
  var nPend = Object.values(S.res.produtos).filter(function (p) { return p.classe === 'pendente'; }).length;
  var tabs = [['apuracao', 'Apuração', ''], ['pendencias', 'Pendências', '<span class="count' + (erros.length ? ' err' : '') + '">' + (erros.length + alertas.length) + '</span>'],
    ['notas', 'Notas', '<span class="count">' + notasF.length + '</span>'], ['produtos', 'Produtos', '<span class="count' + (nPend ? ' err' : '') + '">' + (nPend ? nPend + ' sem classe' : Object.keys(S.res.produtos).length) + '</span>'], ['servicos', 'Serviços e fretes', (function () { var n = Object.values(S.res.servicos).filter(function (x) { return x.classe === 'pendente'; }).length; return n ? '<span class="count">' + n + ' sem classe</span>' : ''; })()], ['reforma', 'IBS/CBS 2026', '']];
  h += '<div class="card"><div class="tabs" role="tablist">' + tabs.map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + t[1] + t[2] + '</button>'; }).join('') + '</div><div class="pbody">';
  if (S.tab === 'apuracao') h += tabApuracao(ds, T);
  else if (S.tab === 'pendencias') h += tabPendencias(pend);
  else if (S.tab === 'notas') h += tabNotas(notasF);
  else if (S.tab === 'produtos') h += tabProdutos();
  else if (S.tab === 'servicos') h += tabServicos(ds, T);
  else h += tabReforma(ds, T);
  h += '</div></div>';
  h += '<p class="legal">Documentos lidos: NF-e, NFC-e, CT-e e NFS-e do padrão nacional. Base: ICMS/SP com tributação normal de pneus e autopeças a partir de 01/10/2026 (Portaria SRE 34/2026, que revogou os Anexos de pneumáticos e autopeças da Portaria CAT 68/2019); PIS/COFINS não cumulativo do Lucro Real (Leis 10.637/2002 e 10.833/2003), com ICMS excluído da base do débito (Tema 69/STF) e do crédito (Lei 14.592/2023); produtos monofásicos conforme a Lei 10.485/2002, sem débito na revenda e sem crédito na compra. Valores apurados a partir dos XMLs; não substituem a escrituração (SPED) nem a apuração oficial.</p>';
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
    h += '<tr><td style="white-space:nowrap;text-transform:' + (S.det === 'mes' ? 'capitalize' : 'none') + '">' + esc(r.lbl) + '<div class="small">' + (t.nS + t.nSP) + ' saídas · ' + (t.nE + t.nST + t.nCT) + ' entradas</div></td><td class="r num">' + m0(t.vendas) + '</td><td class="r num">' + m0(t.compras + t.compOut + t.compIns) + (t.compIns ? '<div class="small">insumo ' + m0(t.compIns) + '</div>' : '') + (t.compOut ? '<div class="small">uso/ativo ' + m0(t.compOut) + '</div>' : '') + '</td><td class="r num">' + m0(t.icmsD) + '</td><td class="r num">' + m0(t.icmsC) + '</td>' + saldoCell(t.icmsD - t.icmsC) + '<td class="r num">' + m0(t.pisD) + '</td><td class="r num">' + m0(t.pisC) + '</td>' + saldoCell(t.pisD - t.pisC) + '<td class="r num">' + m0(t.cofD) + '</td><td class="r num">' + m0(t.cofC) + '</td>' + saldoCell(t.cofD - t.cofC) + '</tr>';
  });
  h += '</tbody><tfoot><tr><td>Total</td><td class="r num">' + m0(T.vendas) + '</td><td class="r num">' + m0(T.compras + T.compOut + T.compIns) + '</td><td class="r num">' + m0(T.icmsD) + '</td><td class="r num">' + m0(T.icmsC) + '</td>' + saldoCell(T.icmsD - T.icmsC) + '<td class="r num">' + m0(T.pisD) + '</td><td class="r num">' + m0(T.pisC) + '</td>' + saldoCell(T.pisD - T.pisC) + '<td class="r num">' + m0(T.cofD) + '</td><td class="r num">' + m0(T.cofC) + '</td>' + saldoCell(T.cofD - T.cofC) + '</tr></tfoot></table></div>';
  h += '<p class="note">PIS e COFINS apurados pela regra (1,65% e 7,6% sobre a receita sem ICMS), não pelo valor destacado nas notas. Produtos monofásicos não geram débito nem crédito. Entradas de setembro com ST não geram crédito de ICMS: o imposto foi encerrado na retenção. Uso e consumo, insumo de serviço e ativo ficam fora do crédito de ICMS (ativo segue o CIAP, 1/48 por mês); insumo de serviço gera crédito de PIS/COFINS.</p>';
  return h;
}

var COD_TIT = { ST_SAIDA: 'Saída ainda como ST', ALIQ_INT: 'Alíquota interna', SEM_TRIB: 'Venda sem ICMS', ALIQ_INTER: 'Alíquota interestadual', ST_INTER: 'ST interestadual', MONO_TRIB: 'PIS/COFINS em monofásico', MONO_CST: 'CST monofásico', TEMA69: 'ICMS na base do PIS/COFINS', ST_FORN: 'Fornecedor reteve ST', ST60_FORN: 'Fornecedor emitiu como ST', ALIQ_FORN: 'Alíquota do fornecedor', ALIQ_INTER_FORN: 'Alíquota interestadual do fornecedor', ST_INTER_FORN: 'ST de outra UF', MONO_FORN: 'Monofásico na compra', INSUMO_MONO: 'Insumo monofásico', PROD_PEND: 'Produto sem classificação', CTE_CALC: 'Cálculo do ICMS do frete', CTE_ALIQ: 'Alíquota do frete', CTE_SP: 'Alíquota do frete em SP', CTE_ST: 'Frete com ST', CTE_MONO: 'Frete de monofásico', CTE_SEM_NF: 'Frete sem a nota da compra', ISS_ALIQ: 'Alíquota do ISS', ISS_CALC: 'Cálculo do ISS', NFSE_PIS: 'PIS/COFINS do serviço', NFSE_CST: 'CST do serviço', SERV_PEND: 'Serviço sem classificação', ISS_RET: 'ISS retido a recolher', ICMS_CALC: 'Cálculo do ICMS', DIFAL: 'DIFAL' };
var COD_IMP = { ST_SAIDA: 'icms', ALIQ_INT: 'icms', SEM_TRIB: 'icms', ALIQ_INTER: 'icms', ST_INTER: 'icms', ST_FORN: 'icms', ST60_FORN: 'icms', ALIQ_FORN: 'icms', ALIQ_INTER_FORN: 'icms', ST_INTER_FORN: 'icms', ICMS_CALC: 'icms', DIFAL: 'icms', MONO_TRIB: 'pc', MONO_CST: 'pc', TEMA69: 'pc', MONO_FORN: 'pc', INSUMO_MONO: 'pc', PROD_PEND: 'ambos', CTE_CALC: 'icms', CTE_ALIQ: 'icms', CTE_SP: 'icms', CTE_ST: 'icms', CTE_MONO: 'pc', CTE_SEM_NF: 'pc', ISS_ALIQ: 'iss', ISS_CALC: 'iss', NFSE_PIS: 'pc', NFSE_CST: 'pc', SERV_PEND: 'pc', ISS_RET: 'iss' };
var IMP_LBL = { icms: 'ICMS', pc: 'PIS/COFINS', iss: 'ISS', ambos: 'ICMS e PIS/COFINS' };
function impDe(p) { return COD_IMP[p.cod] || 'ambos'; }
function impOk(p) { var i = impDe(p); return S.fImp === 'todos' || i === S.fImp || i === 'ambos'; }

function tabPendencias(pend) {
  var f = pend.filter(function (p) { return impOk(p) && (S.fQuem === 'todos' || p.quem === S.fQuem) && (S.fSev === 'todos' || p.sev === S.fSev) && bate(S.q, [p.n, p.ch, p.parte, p.ncm, p.x, p.msg, COD_TIT[p.cod]]); });
  var ord = { erro: 0, alerta: 1, info: 2 }; f.sort(function (a, b) { return ord[a.sev] - ord[b.sev] || (a.dt < b.dt ? 1 : -1); });
  var cI = function (k) { return pend.filter(function (p) { return p.sev !== 'info' && (k === 'todos' || impDe(p) === k); }).length; };
  var h = '<div class="toolbar"><div class="chips" role="group" aria-label="Imposto">' + [['todos', 'Todos os impostos'], ['icms', 'ICMS'], ['pc', 'PIS/COFINS'], ['iss', 'ISS']].map(function (c) { return '<button type="button" class="chip" data-fimp="' + c[0] + '" aria-pressed="' + (S.fImp === c[0]) + '">' + c[1] + ' <span class="num">(' + cI(c[0]) + ')</span></button>'; }).join('') + '</div></div>';
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
    h += '<tr><td><span class="pill ' + (n.dir === 'X' ? 'E' : n.dir) + '">' + (n.dir === 'S' ? 'Saída' : n.dir === 'X' ? 'Informativo' : 'Entrada') + '</span><div class="small">' + (n.tipo === 'cte' ? 'CT-e' + (n.extra && !n.extra.tomadora ? ' · ' + esc(n.extra.papel) : '') : n.tipo === 'nfse' ? 'NFS-e · cód. ' + esc(n.extra.cod) : (n.mod === '65' ? 'NFC-e' : 'NF-e') + (n.interna ? ' · interna' : ' · interestadual')) + '</div></td><td class="num">' + brFull(n.dt) + '</td><td class="num">' + esc(n.n) + '<div class="small mono" title="' + esc(n.ch) + '">' + esc(n.ch.slice(0, 4) + '…' + n.ch.slice(-8)) + '</div></td><td>' + esc(n.parte.n || 'Consumidor final') + '<div class="small">' + esc(fmtCnpj(n.parte.c)) + (n.parte.uf ? ' · ' + esc(n.parte.uf) : '') + '</div></td><td class="r num">' + m0(n.vNF) + '</td><td class="r num">' + m0(icms) + '<div class="small">' + (n.dir === 'S' ? 'débito' : n.dir === 'X' ? 'sem crédito' : 'crédito') + '</div></td><td class="r num">' + m0(pc) + '</td><td>' + (n.pior ? '<span class="pill ' + n.pior + '">' + n.nIss + ' ' + (n.nIss === 1 ? 'ponto' : 'pontos') + '</span>' : '<span class="pill ok">OK</span>') + '</td></tr>';
  });
  h += '</tbody></table></div>';
  if (notas.length > 400) h += '<p class="note">Mostrando 400 de ' + notas.length + '. Use a busca.</p>';
  return h;
}
var CLASSES = [['revenda', 'Revenda'], ['insumo', 'Insumo de serviço'], ['uso', 'Uso e consumo'], ['ativo', 'Ativo']];
var ORIGEM = { manual: 'Definido pelo escritório', ncm: 'Regra do NCM', sugerido: 'Sugerido pelo NCM (pneus/autopeças)', nenhum: '' };
function tabProdutos() {
  var todos = Object.values(S.res.produtos);
  var cnt = function (c) { return todos.filter(function (p) { return c === 'todos' || p.classe === c; }).length; };
  var f = todos.filter(function (p) { return (S.fProd === 'todos' || p.classe === S.fProd) && bate(S.q, [p.x, p.cp, p.ncm, p.fn, p.fc]); });
  f.sort(function (a, b) { return (a.classe === 'pendente' ? 0 : 1) - (b.classe === 'pendente' ? 0 : 1) || b.v - a.v; });
  var h = '<p class="note">Produtos comprados de fornecedores. Revenda entra no escopo de pneus e autopeças (regras de ST e de alíquota). Insumo de serviço (peça aplicada na prestação do serviço) dá crédito de PIS/COFINS, mas não de ICMS. Uso e consumo e ativo saem do crédito de ICMS e de PIS/COFINS. NCM de pneus e autopeças já vem sugerido como revenda. A classificação fica no histórico e vale para as próximas importações.</p>';
  h += '<div class="toolbar"><div class="chips" role="group" aria-label="Classificação">' + [['todos', 'Todos'], ['pendente', 'Sem classificação'], ['revenda', 'Revenda'], ['insumo', 'Insumo de serviço'], ['uso', 'Uso e consumo'], ['ativo', 'Ativo']].map(function (c) { return '<button type="button" class="chip" data-fprod="' + c[0] + '" aria-pressed="' + (S.fProd === c[0]) + '">' + c[1] + ' <span class="num">(' + cnt(c[0]) + ')</span></button>'; }).join('') + '</div>';
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
var CLASSES_SERV = [['insumo', 'Insumo de serviço'], ['uso', 'Sem crédito']];
function tabServicos(ds, T) {
  var h = '<div class="stats">' +
    '<div class="stat"><div class="k">Serviços prestados</div><div class="v num">' + m0(T.servPrest) + '</div><div class="k">ISS a recolher ' + m0(T.issDev) + (T.issRetSof ? ' · retido pelos tomadores ' + m0(T.issRetSof) : '') + (T.retFedSof ? ' · retenções federais sofridas ' + m0(T.retFedSof) : '') + '</div></div>' +
    '<div class="stat"><div class="k">Serviços tomados</div><div class="v num">' + m0(T.servTom) + '</div><div class="k">com crédito de PIS/COFINS ' + m0(T.servIns) + (T.issRetTom ? ' · ISS retido a recolher ' + m0(T.issRetTom) : '') + (T.retFedTom ? ' · retenções federais a recolher ' + m0(T.retFedTom) : '') + '</div></div>' +
    '<div class="stat"><div class="k">Fretes tomados (CT-e)</div><div class="v num">' + m0(T.freteTom) + '</div><div class="k">crédito ICMS ' + m0(T.icmsFrete) + ' · PIS/COFINS ' + m0(T.pcFrete) + '</div></div>' +
    '<div class="stat"><div class="k">CT-e sem ser tomadora</div><div class="v num">' + T.nCX + '</div><div class="k">frete pago por outro (ex.: marketplace); sem crédito</div></div></div>';

  var serv = Object.values(S.res.servicos).filter(function (x) { return bate(S.q, [x.x, x.desc, x.fn, x.fc, x.cod]); });
  serv.sort(function (a, b) { return (a.classe === 'pendente' ? 0 : 1) - (b.classe === 'pendente' ? 0 : 1) || b.v - a.v; });
  h += '<div><h3>Serviços tomados</h3><p class="note" style="margin-top:4px">Classifique como insumo o serviço usado na prestação de serviço da empresa (art. 3º, II, das Leis 10.637/2002 e 10.833/2003): ele gera crédito de PIS/COFINS. Na revenda de mercadorias, o entendimento predominante da Receita é que serviços como tarifas de marketplace, planos de saúde e assessorias não são insumo. A classificação vale para o mesmo prestador e código de serviço nas próximas notas.</p></div>';
  if (!serv.length) h += '<p class="small">Nenhuma NFS-e tomada no período.</p>';
  else {
    h += '<div class="tscroll"><table><thead><tr><th>Prestador</th><th>Serviço</th><th class="r">Valor</th><th>Classificação</th></tr></thead><tbody>';
    serv.forEach(function (x) {
      var ctrl = S.readonly ? (x.classe === 'pendente' ? '<span class="pill alerta">Sem classificação</span>' : '<span class="pill ok">' + (x.classe === 'insumo' ? 'Insumo de serviço' : 'Sem crédito') + '</span>')
        : '<div class="seg" role="group" aria-label="Classificar serviço">' + CLASSES_SERV.map(function (c) { return '<button type="button" data-cserv="' + c[0] + '" data-pk="' + esc(x.k) + '" aria-pressed="' + (x.classe === c[0]) + '">' + c[1] + '</button>'; }).join('') + '</div>' +
          '<div style="margin-top:5px">' + (x.classe === 'pendente' ? '<span class="pill alerta">Sem classificação</span>' : '<span class="small">Definido pelo escritório</span> <button type="button" class="link" data-desfazer="' + esc(x.k) + '" data-origem="manual" data-ncm="">Desfazer</button>') + '</div>';
      h += '<tr><td>' + esc(x.fn) + '<div class="small">' + esc(fmtCnpj(x.fc)) + '</div></td><td class="msg">' + esc(x.x) + '<div class="small">Cód. ' + esc(x.cod) + (x.desc ? ' · ' + esc(x.desc.slice(0, 80)) : '') + '</div></td><td class="r num">' + m0(x.v) + '<div class="small">' + x.n + ' ' + (x.n === 1 ? 'nota' : 'notas') + '</div></td><td>' + ctrl + '</td></tr>';
    });
    h += '</tbody></table></div>';
  }

  var fr = S.res.fretes.filter(function (f) { return ds.indexOf(f.dt) >= 0 && bate(S.q, [f.n, f.transp, f.toma, f.papel]); });
  h += '<div><h3>Fretes (CT-e)</h3><p class="note" style="margin-top:4px">O crédito do frete é de quem paga, o tomador. Quando o tomador é outra empresa, como o Mercado Livre nas vendas com envio dele, o CT-e é apenas informativo.</p></div>';
  if (!fr.length) h += '<p class="small">Nenhum CT-e no período.</p>';
  else {
    h += '<div class="tscroll"><table><thead><tr><th>Data</th><th>CT-e</th><th>Transportadora</th><th>Papel da empresa</th><th class="r">Valor</th><th class="r">Crédito ICMS</th><th class="r">Crédito PIS/COFINS</th></tr></thead><tbody>';
    fr.slice(0, 400).forEach(function (f) {
      h += '<tr><td class="num">' + brFull(f.dt) + '</td><td class="num">' + esc(f.n) + '<div class="small">' + esc(f.rota) + '</div></td><td>' + esc(f.transp) + '</td><td>' + (f.tomadora ? '<span class="pill ok">Tomadora</span><div class="small">' + esc(f.papel) + '</div>' : '<span class="pill E">Não tomadora</span><div class="small">' + esc(f.papel) + ' · paga: ' + esc(f.toma) + '</div>') + '</td><td class="r num">' + m0(f.v) + '</td><td class="r num">' + m0(f.credICMS) + '</td><td class="r num">' + m0(f.credPC) + '</td></tr>';
    });
    h += '</tbody></table></div>';
  }
  return h;
}

async function classificarServ(pk, classe) {
  var e = S.emp, x = S.res.servicos[pk] || {}, agora = new Date().toISOString(), a = e.prodCad[pk];
  e.prodCad[pk] = { c: classe, em: agora, x: x.x || '', ncm: '' };
  e.hist.push({ em: agora, alvo: 'produto', ref: pk, x: 'Serviço ' + (x.cod || '') + ' · ' + (x.fn || ''), de: a ? a.c : null, para: classe });
  recalcular(); renderMain();
  if (S.exemplo) return;
  try { await B.classificarProduto(e.id, pk, '', 'Serviço ' + (x.cod || '') + ' · ' + (x.fn || ''), classe); }
  catch (err) { if (a) e.prodCad[pk] = a; else delete e.prodCad[pk]; e.hist.pop(); recalcular(); renderMain(); toast('Não foi possível salvar a classificação: ' + erroTexto(err)); }
}

function tabReforma(ds, T) {
  var h = '<p class="note">Em 2026 a CBS (0,9%) e o IBS (0,1%) são destacados nas notas em caráter de teste. Os valores vêm do grupo IBS/CBS dos XMLs e são informativos: não alteram a apuração de ICMS, PIS e COFINS.</p>';
  h += '<div class="tscroll"><table><thead><tr><th>Mês</th><th class="r">CBS destacada</th><th class="r">IBS destacado</th><th class="r">Notas</th></tr></thead><tbody>';
  S.per.meses.forEach(function (m) { var x = m.dias.filter(function (d) { return ds.indexOf(d) >= 0; }); if (!x.length) return; var t = F.somaDias(S.res.dias, x); h += '<tr><td style="text-transform:capitalize">' + esc(mesNome(m.mes)) + '</td><td class="r num">' + m0(t.cbs) + '</td><td class="r num">' + m0(t.ibs) + '</td><td class="r num">' + docs(t) + '</td></tr>'; });
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
    var e = await B.garantirEmpresa(cnpj, nomeDe(acc.notas, cnpj));
    S.empresas = await B.empresas();
    var d = await B.carregar(cnpj, true);
    abrirEmpresa(montarEmpresa(e, d), false, false);
    S.modo = 'escritorio';
    await integrar(acc, cnpj);
    carregarAcessos();
  } catch (err) { S.imp = null; toast('Não foi possível importar: ' + erroTexto(err)); render(); }
}
async function importar(files) {
  if (!files || !files.length || !S.emp) return;
  S.imp = { lendo: true, arquivos: 0 }; renderOffice();
  try { await integrar(await lerArquivos(files), S.emp.meta.cnpj); }
  catch (err) { S.imp = null; toast('Não foi possível importar: ' + erroTexto(err)); render(); }
}
async function integrar(acc, cnpj) {
  var e = S.emp, daEmp = [], terceiros = 0;
  acc.notas.forEach(function (n) { if (envolve(n, cnpj)) daEmp.push(n); else terceiros++; });
  var porCh = {}; daEmp.forEach(function (n) { porCh[n.ch] = n; }); daEmp = Object.keys(porCh).map(function (k) { return porCh[k]; });
  var canc = Object.keys(acc.canc);
  if (!S.exemplo) {
    S.imp = { gravando: true, gravadas: 0, total: daEmp.length }; render();
    await B.salvarNotas(cnpj, daEmp, function (feitas, total) { S.imp = { gravando: true, gravadas: feitas, total: total }; renderOffice(); });
    await B.salvarCancelamentos(cnpj, canc);
    if (!e.meta.nome) { var nm = nomeDe(daEmp, cnpj); if (nm) { await B.salvarEmpresa(cnpj, { razao_social: nm }); e.meta.nome = nm; } }
  }
  var atual = {}; e.notas.forEach(function (n) { atual[n.ch] = n; });
  daEmp.forEach(function (n) { atual[n.ch] = n; e.pub[n.ch] = false; });
  e.notas = Object.keys(atual).map(function (k) { return atual[k]; });
  canc.forEach(function (c) { e.canc[c] = 1; });
  S.imp = { feito: true, arquivos: acc.arquivos, notas: daEmp.length, canc: canc.length, terceiros: terceiros, erros: acc.erros };
  S.periodo = 'all'; recalcular(); render();
  toast(daEmp.length + (daEmp.length === 1 ? ' documento gravado' : ' documentos gravados') + '. Revise e publique para o cliente.');
}

async function publicar() {
  if (!S.emp || S.exemplo) return;
  S.ocupado = true; render();
  try {
    var nome = $('nome') ? $('nome').value.trim() : '';
    if (nome && nome !== S.emp.meta.nome) { await B.salvarEmpresa(S.emp.id, { razao_social: nome }); S.emp.meta.nome = nome; }
    await B.publicar(S.emp.id);
    for (var k in S.emp.pub) S.emp.pub[k] = true;
    S.emp.meta.publicado = Date.now();
    toast('Publicado. O cliente já vê esta versão.');
  } catch (err) { toast('Não foi possível publicar: ' + erroTexto(err)); }
  S.ocupado = false; render();
}

async function classificar(pk, ncm, classe) {
  var e = S.emp, agora = new Date().toISOString(), p = S.res.produtos[pk] || {};
  var antes = { prod: JSON.parse(JSON.stringify(e.prodCad)), ncm: JSON.parse(JSON.stringify(e.ncmCad)) };
  if (S.porNcm && ncm) {
    var ant = e.ncmCad[ncm]; e.ncmCad[ncm] = { c: classe, em: agora };
    e.hist.push({ em: agora, alvo: 'ncm', ref: ncm, x: 'NCM ' + ncm, de: ant ? ant.c : null, para: classe });
    Object.keys(e.prodCad).forEach(function (k) { if (e.prodCad[k].ncm === ncm) delete e.prodCad[k]; });
  } else {
    var a = e.prodCad[pk]; e.prodCad[pk] = { c: classe, em: agora, x: p.x || '', ncm: ncm || '' };
    e.hist.push({ em: agora, alvo: 'produto', ref: pk, x: (p.x || '') + ' · ' + (p.fn || ''), de: a ? a.c : null, para: classe });
  }
  recalcular(); renderMain();
  if (S.exemplo) return;
  try {
    if (S.porNcm && ncm) await B.classificarNcm(e.id, ncm, classe);
    else await B.classificarProduto(e.id, pk, ncm, (p.x || '') + ' · ' + (p.fn || ''), classe);
  } catch (err) { e.prodCad = antes.prod; e.ncmCad = antes.ncm; e.hist.pop(); recalcular(); renderMain(); toast('Não foi possível salvar a classificação: ' + erroTexto(err)); }
}
async function desfazerClasse(pk, origem, ncm) {
  var e = S.emp, agora = new Date().toISOString();
  if (origem === 'ncm') { e.hist.push({ em: agora, alvo: 'ncm', ref: ncm, x: 'NCM ' + ncm, de: e.ncmCad[ncm] && e.ncmCad[ncm].c, para: null }); delete e.ncmCad[ncm]; }
  else { e.hist.push({ em: agora, alvo: 'produto', ref: pk, x: (e.prodCad[pk] && e.prodCad[pk].x) || pk, de: e.prodCad[pk] && e.prodCad[pk].c, para: null }); delete e.prodCad[pk]; }
  recalcular(); renderMain();
  if (S.exemplo) return;
  try { if (origem === 'ncm') await B.removerNcm(e.id, ncm); else await B.removerProduto(e.id, pk); }
  catch (err) { toast('Não foi possível desfazer: ' + erroTexto(err)); }
}

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
  if (d.login) { S.telaLogin = d.login; S.erro = ''; S.aviso = ''; render(); return; }
  if (d.classe) { if (!S.readonly) classificar(d.pk, d.ncm, d.classe); return; }
  if (d.cserv) { if (!S.readonly) classificarServ(d.pk, d.cserv); return; }
  if (d.desfazer) { desfazerClasse(d.desfazer, d.origem, d.ncm); return; }
  if (d.abrir) { abrirDoBanco(d.abrir, !(S.usuario && S.usuario.papel === 'escritorio')); return; }
  if (d.remover) {
    B.removerAcesso(S.emp.id, d.remover).then(function () { toast('Acesso removido.'); carregarAcessos(); }).catch(function (e) { toast(erroTexto(e)); });
    return;
  }
  var a = d.act;
  if (a === 'exemplo') carregarExemplo();
  else if (a === 'sair') { B.sair().then(function () { S.usuario = null; S.emp = null; S.empresas = []; S.view = 'login'; S.telaLogin = 'entrar'; render(); }); }
  else if (a === 'inicio' || a === 'voltar') { if (S.usuario) voltarEmpresas(); else { S.emp = null; S.exemplo = false; S.view = 'login'; render(); } }
  else if (a === 'csv') csv();
  else if (a === 'publicar') publicar();
  else if (a === 'irProdutos') { S.tab = 'produtos'; S.fProd = 'pendente'; renderMain(); }
  else if (a === 'aplicarMono') {
    var lista = $('mono').value.split(/\s+/).map(function (s) { return s.replace(/\D/g, ''); }).filter(Boolean);
    var corte = $('corte').value || '2026-10-01';
    S.emp.meta.mono = lista; S.emp.meta.corte = corte; recalcular(); render();
    var msg = lista.length ? 'Análise recalculada.' : 'Lista vazia: a análise usa a lista padrão de pneus e autopeças.';
    if (S.exemplo) { toast(msg); return; }
    B.salvarEmpresa(S.emp.id, { ncm_monofasico: lista, corte_st: corte }).then(function () { toast(msg + ' Salvo.'); }).catch(function (e) { toast('Não foi possível salvar: ' + erroTexto(e)); });
  }
  else if (a === 'apagar') { S.confirmDel = true; renderOffice(); }
  else if (a === 'apagarNao') { S.confirmDel = false; renderOffice(); }
  else if (a === 'apagarSim') { B.apagarEmpresa(S.emp.id).then(function () { toast('Empresa apagada.'); voltarEmpresas(); }).catch(function (e) { toast(erroTexto(e)); }); }
});
document.addEventListener('submit', async function (ev) {
  ev.preventDefault();
  var f = ev.target;
  if (f.id === 'fLogin') {
    var email = $('email').value.trim(), senha = $('senha') ? $('senha').value : '';
    S.emailDigitado = email;
    S.ocupado = true; S.erro = ''; S.aviso = ''; render();
    try {
      if (S.telaLogin === 'criar') {
        var r = await B.criarConta(email, senha);
        S.ocupado = false;
        if (r.session) { await iniciar(); return; }
        S.telaLogin = 'entrar'; S.aviso = 'Conta criada. Confirme pelo link enviado para ' + email + ' e depois entre.';
      } else if (S.telaLogin === 'esqueci') {
        await B.esqueciSenha(email); S.ocupado = false; S.telaLogin = 'entrar'; S.aviso = 'Se o e-mail estiver cadastrado, o link para nova senha chega em instantes.';
      } else { await B.entrar(email, senha); S.ocupado = false; await iniciar(); return; }
    } catch (e) { S.ocupado = false; S.erro = erroTexto(e); }
    render();
  } else if (f.id === 'fNovaSenha') {
    try { await B.novaSenha($('senhaN').value); toast('Senha alterada.'); history.replaceState(null, '', location.pathname); S.view = 'carregando'; await iniciar(); }
    catch (e) { S.erro = erroTexto(e); render(); }
  } else if (f.id === 'fAcesso') {
    var em = $('acEmail').value.trim(), sn = $('acSenha').value;
    try { var ra = await B.criarAcesso(S.emp.id, em, sn); toast((ra && ra.criado ? 'Conta criada e acesso liberado para ' : 'Acesso liberado para ') + em + '.'); carregarAcessos(); }
    catch (e) { toast('Não foi possível liberar: ' + erroTexto(e)); }
  }
});
document.addEventListener('input', function (ev) { if (ev.target.id === 'q') { S.q = ev.target.value.trim(); renderMain(); } });
document.addEventListener('change', function (ev) {
  var t = ev.target;
  if (t.id === 'porNcm') { S.porNcm = t.checked; return; }
  var lista = t.files ? Array.prototype.slice.call(t.files) : [];
  if (t.id === 'files') { importar(lista); t.value = ''; }
  else if (t.id === 'arqNova') { importarNova(lista); t.value = ''; }
  else if (t.id === 'nome' && S.emp && !S.exemplo) {
    var nm = t.value.trim(); S.emp.meta.nome = nm;
    B.salvarEmpresa(S.emp.id, { razao_social: nm }).then(function () { toast('Razão social salva.'); renderHeaderSub(); }).catch(function (e) { toast(erroTexto(e)); });
  }
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
    var e = { id: 'exemplo', meta: { cnpj: '12345678000190', nome: 'Pneus e Peças Exemplo Ltda (fictícia)', corte: '2026-10-01', mono: F.DEFAULT_MONO.slice(), publicado: null },
      notas: acc.notas, pub: {}, canc: acc.canc, prodCad: {}, ncmCad: {}, hist: [] };
    abrirEmpresa(e, !(S.usuario && S.usuario.papel === 'escritorio'), true);
  } catch (err) { toast('Não foi possível carregar o exemplo.'); }
}

/* ---------- início ---------- */
var tab = ls('pf.tab'); if (tab) S.tab = tab;
if (/type=recovery/.test(location.hash)) S.view = 'recuperar';
B.aoMudarSessao(function (evento) {
  if (evento === 'PASSWORD_RECOVERY') { S.view = 'recuperar'; render(); }
});
render();
iniciar();
})();
