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
  fSit: 'abertas', fNota: 'todas', editAc: null, imp: null, confirmDel: false, ocupado: false, erro: '', aviso: '', telaLogin: 'entrar', equipe: null, confirmEquipe: null
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
  zap: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l1.3-3.8A8 8 0 1 1 8 19z"/><path d="M9 9.5c.3 2 1.7 3.6 3.6 4.4l1.2-1.1 2 .9c-.2 1.2-1.2 1.9-2.4 1.8-3.2-.3-6-3.1-6.3-6.3C7 8 7.7 7 8.9 6.8l.9 2z"/></svg>',
  link: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
  ajuda: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.2-2.5 3.9"/><path d="M12 17h.01"/></svg>',
  sol: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  lua: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
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
  if (r.tipo === 'nfe' && r.nota.ch) { acc.notas.push(r.nota); acc.xml[r.nota.ch] = t; }
  else if (r.tipo === 'evento') { if (r.tpEvento === '110111' && r.chave) acc.canc[r.chave] = 1; acc.eventos++; }
  else acc.outros++;
}
async function lerArquivos(files) {
  var acc = { notas: [], canc: {}, xml: {}, erros: 0, eventos: 0, outros: 0, arquivos: 0 };
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
    hist: d.hist.map(function (h) { return { em: h.alterado_em, alvo: h.alvo, ref: h.referencia, x: h.descricao, de: h.classe_anterior, para: h.classe_nova }; }).reverse(),
    acomp: (function () { var a = {}; (d.acomp || []).forEach(function (x) { a[x.chave] = { s: x.status, t: x.texto, em: x.atualizado_em }; }); return a; })() };
}
function metaDe(e) { return { cnpj: e.cnpj, nome: e.razao_social, corte: e.corte_st, segmento: e.segmento || 'autopecas', regime: e.regime || 'real', mono: e.ncm_monofasico || [], st: e.ncm_st || [], publicado: e.publicado_em ? new Date(e.publicado_em).getTime() : null }; }
function pendentesPublicar() { if (!S.emp || S.exemplo) return 0; var n = 0; for (var k in S.emp.pub) if (!S.emp.pub[k]) n++; return n; }

function cfgAtual() {
  var e = S.emp, m = e.meta;
  return { cnpj: m.cnpj, segmento: m.segmento || 'autopecas', regime: m.regime || 'real', classificar: Regras.classificar, corte: m.corte || '2026-10-01', mono: (m.mono && m.mono.length) ? m.mono : F.DEFAULT_MONO, st: (m.st && m.st.length) ? m.st : F.DEFAULT_ST, canceladas: e.canc,
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
    if (p.papel === 'escritorio') { S.view = 'escritorio'; render(); contarTudo(); carregarEquipe(); }
    else if (S.empresas.length === 1) await abrirDoBanco(S.empresas[0].cnpj, true);
    else { S.view = 'cliente'; render(); }
  } catch (e) { S.view = 'login'; S.erro = erroTexto(e); render(); }
}
async function carregarEquipe() {
  try { S.equipe = await B.equipe(); } catch (e) { S.equipe = []; }
  if (S.view === 'escritorio') render();
}
function vEquipe() {
  var h = '<div class="card" style="padding:18px;display:flex;flex-direction:column;gap:14px"><div><h2>Equipe do escritório</h2><p class="note">Quem está aqui vê e altera todas as empresas: importa notas, classifica, publica e libera o acesso dos clientes.</p></div>';
  if (S.equipe === null) h += '<p class="small">Carregando…</p>';
  else h += '<div class="tscroll"><table><tbody>' + S.equipe.map(function (u) {
    var eu = S.usuario && u.user_id === S.usuario.id;
    var acao = eu ? '<span class="small">você</span>' : (S.confirmEquipe === u.user_id
      ? '<span class="confirm"><span>Remover ' + esc(u.email) + ' da equipe?</span><button class="btn danger" type="button" data-rmeq="' + esc(u.user_id) + '">Remover</button><button class="btn" type="button" data-act="cancelaEq">Cancelar</button></span>'
      : '<button class="link" type="button" data-pedeeq="' + esc(u.user_id) + '">Remover da equipe</button>');
    return '<tr><td>' + esc(u.email) + '<div class="small">' + (u.ultimo_acesso ? 'último acesso ' + new Date(u.ultimo_acesso).toLocaleDateString('pt-BR') : 'nunca entrou') + '</div></td><td class="r">' + acao + '</td></tr>';
  }).join('') + '</tbody></table></div>';
  h += '<form id="fEquipe" class="row"><div class="field"><label for="eqEmail">E-mail</label><input id="eqEmail" type="email" required autocomplete="off"></div><div class="field"><label for="eqSenha">Senha inicial</label><input id="eqSenha" type="text" minlength="8" required autocomplete="off"></div><button class="btn" type="submit">Adicionar à equipe</button></form>';
  h += '<p class="note">A conta é criada já pronta para entrar com essa senha. Se o e-mail já tiver conta, ela passa a ser do escritório e a senha não muda. Peça para trocar a senha em "Esqueci a senha" no primeiro acesso.</p></div>';
  return h;
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
  if ((S.readonly || S.demo) && !S.tourVisto && ls('pf.tourOff') !== '1') { S.tourVisto = true; setTimeout(function () { iniciarTour(); }, 350); }
}
function voltarEmpresas() {
  if (S.demo) { S.demo = false; try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} S.emp = null; S.res = null; S.exemplo = false; S.view = 'carregando'; render(); iniciar(); return; }
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
var LOGO = '<svg class="logo" viewBox="0 0 40 40" aria-hidden="true"><rect x="1" y="1" width="38" height="38" rx="11" fill="var(--logo-bg)"/><text x="20" y="23.5" text-anchor="middle" font-family="Sora, IBM Plex Sans, sans-serif" font-weight="700" font-size="15" letter-spacing="-.5" fill="var(--logo-fg)">RG</text>' +
  [0, 2.4, 3.6, 6, 8.4, 9.6, 12, 13.2, 15.6, 18, 19.2, 21.6].map(function (x, i) { return '<rect x="' + (9 + x) + '" y="28" width="' + (i % 3 === 1 ? 0.8 : 1.4) + '" height="4.5" fill="var(--logo-bar)"/>'; }).join('') + '</svg>';
function WA(n) { return 'https://wa.me/' + n + '?text=' + encodeURIComponent('Olá! Vi a demonstração do portal da RG Fiscal e quero saber como funciona para a minha empresa.'); }
function linkDemo() { return location.origin + location.pathname + '#demo'; }
function faixa(conteudo, extra) { return '<div class="faixa' + (extra ? ' ' + extra : '') + '">' + conteudo + '</div>'; }
function temaAtual() { var t = document.documentElement.getAttribute('data-theme'); if (t) return t; return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
function nav(extra) {
  var escuro = temaAtual() === 'dark';
  var tema = '<button class="btn ghost tema" type="button" data-act="tema" aria-label="' + (escuro ? 'Usar tema claro' : 'Usar tema escuro') + '" title="' + (escuro ? 'Tema claro' : 'Tema escuro') + '">' + (escuro ? I.sol : I.lua) + '</button>';
  var ajuda = S.view === 'painel' ? '<button class="btn ghost tema" type="button" data-act="tour" aria-label="Como usar o portal" title="Como usar o portal">' + I.ajuda + '</button>' : '';
  var quem = ajuda + tema + (S.usuario ? '<span class="small">' + esc(S.usuario.email) + '</span><button class="btn ghost" type="button" data-act="sair">Sair</button>' : '');
  return '<nav class="nav"><button type="button" class="brand" data-act="inicio" aria-label="RG Fiscal, início">' + LOGO + '<span class="brand-t"><b>RG Fiscal</b><span>Reis &amp; Godói Consultoria Tributária</span></span></button><div class="nav-r">' + (extra || '') + quem + '</div></nav>';
}

function vLogin() {
  var criar = S.telaLogin === 'criar', esq = S.telaLogin === 'esqueci';
  var h = faixa(nav() + '<div class="faixa-login"><h1>Portal do cliente</h1><p>Suas notas fiscais conferidas, a apuração de ICMS, PIS e COFINS e o que precisa ser corrigido, num lugar só.</p></div>', 'alta');
  h += '<div class="card gate"><h2>' + (criar ? 'Criar conta' : esq ? 'Esqueci a senha' : 'Entrar') + '</h2>';
  h += '<p class="note">' + (criar ? 'Cadastre seu e-mail e uma senha. O escritório libera o acesso à sua empresa depois.' : esq ? 'Enviaremos um link para você definir uma nova senha.' : 'Use o e-mail e a senha que a RG Fiscal enviou para você.') + '</p>';
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
  return faixa(nav() + '<div class="faixa-login"><h1>Nova senha</h1><p>Defina a nova senha da sua conta.</p></div>', 'alta') + '<div class="card gate"><h2>Nova senha</h2>' +
    '<form id="fNovaSenha" class="row" style="flex-direction:column;align-items:stretch"><div class="field"><label for="senhaN">Nova senha</label><input id="senhaN" type="password" autocomplete="new-password" minlength="8" required></div>' +
    (S.erro ? '<div class="banner">' + esc(S.erro) + '</div>' : '') + '<button class="btn primary" type="submit">Salvar nova senha</button></form></div>';
}
function vListaCliente() {
  var h = faixa(nav() + '<header class="top"><div><h1>Suas empresas</h1><div class="sub">Escolha a empresa para ver a apuração e as notas.</div></div></header>');
  if (!S.empresas.length) return h + '<div class="card"><div class="empty"><h2>Acesso ainda não liberado</h2><p class="note">Sua conta foi criada, mas o escritório ainda não vinculou nenhuma empresa a ela. Avise o escritório com o e-mail ' + esc(S.usuario.email) + '.</p></div></div>';
  return h + '<div class="empresas">' + S.empresas.map(function (e) { return '<button type="button" class="card emp" data-abrir="' + esc(e.cnpj) + '"><span class="eyebrow">' + esc(fmtCnpj(e.cnpj)) + '</span><h3>' + esc(e.razao_social || 'Empresa') + '</h3><span class="small">' + (e.publicado_em ? 'Atualizado em ' + new Date(e.publicado_em).toLocaleDateString('pt-BR') : 'Aguardando a primeira publicação') + '</span></button>'; }).join('') + '</div>';
}
function vEscritorio() {
  var h = faixa(nav() + '<header class="top"><div><h1>Empresas</h1><div class="sub">Área do escritório. O cliente só vê o que for publicado.</div></div>' +
    '<div class="row"><label class="btn primary" for="arqNova">' + I.up + 'Importar XMLs de nova empresa</label><input type="file" id="arqNova" accept=".zip,.xml" multiple hidden>' +
    '<button class="btn" type="button" data-act="exemplo">Ver com notas de exemplo</button><button class="btn" type="button" data-act="copiarDemo">' + I.link + 'Copiar link de demonstração</button></div></header>');
  if (S.imp && (S.imp.lendo || S.imp.gravando)) h += '<div class="banner info">' + (S.imp.gravando ? 'Gravando notas no banco… ' + S.imp.gravadas + ' de ' + S.imp.total : 'Lendo ' + S.imp.arquivos + ' arquivos…') + '</div>';
  if (S.empresas.length) {
    h += '<div class="empresas">' + S.empresas.map(function (e) {
      var c = S.contagens[e.cnpj];
      return '<button type="button" class="card emp" data-abrir="' + esc(e.cnpj) + '"><span class="eyebrow">' + esc(fmtCnpj(e.cnpj)) + '</span><h3>' + esc(e.razao_social || 'Sem nome') + '</h3>' +
        '<span class="small">' + (c ? c.total + ' notas · ' : '') + (e.publicado_em ? 'publicado em ' + new Date(e.publicado_em).toLocaleDateString('pt-BR') : 'nunca publicado') + '</span>' +
        (c ? (c.pendentes ? '<span><span class="pill alerta">' + c.pendentes + ' notas não publicadas</span></span>' : '<span><span class="pill ok">Publicado</span></span>') : '') + '</button>';
    }).join('') + '</div>';
  } else h += '<div class="card"><div class="empty"><h2>Nenhuma empresa cadastrada</h2><p class="note">Importe os XMLs de uma empresa para começar. O CNPJ é detectado pelas notas.</p></div></div>';
  h += vEquipe();
  return h;
}
function vPainel() {
  var e = S.emp, m = e.meta;
  var navR = S.readonly ? (S.empresas.length > 1 ? '<button class="btn ghost" type="button" data-act="voltar">' + I.back + 'Empresas</button>' : '') :
    '<div class="seg" role="group" aria-label="Modo"><button type="button" data-modo="cliente" aria-pressed="' + (S.modo === 'cliente') + '">Visão do cliente</button><button type="button" data-modo="escritorio" aria-pressed="' + (S.modo === 'escritorio') + '">Escritório</button></div>' +
    '<button class="btn ghost" type="button" data-act="voltar">' + I.back + 'Empresas</button>';
  if (S.exemplo && (!S.usuario || S.demo)) navR = '<button class="btn ghost" type="button" data-act="voltar">' + (S.demo ? 'Já sou cliente' : I.back + 'Entrar') + '</button>';
  var h = faixa(nav(navR) + '<header class="top"><div style="min-width:0"><h1 id="titEmp"></h1><div class="sub" id="subtitle"></div></div>' +
    '<div><label class="search" for="q">' + I.search + '<input id="q" type="search" placeholder="Buscar nota, fornecedor, NCM, pendência…" autocomplete="off" value="' + esc(S.q) + '"></label></div></header>' +
    '<div class="veredito" id="veredito"></div>');
  var pend = pendentesPublicar();
  if (S.demo) h += '<div class="banner demo"><span class="grow"><b>Demonstração com notas fictícias</b> de uma revendedora de pneus e autopeças. Navegue à vontade: veja as pendências, abra as notas e baixe o Excel. Quer ver com as notas da sua empresa? Fale com a RG Fiscal.</span>' +
    '<a class="btn primary" target="_blank" rel="noopener" href="' + WA('5516981505852') + '">' + I.zap + 'Cassiano</a><a class="btn primary" target="_blank" rel="noopener" href="' + WA('5516993392325') + '">' + I.zap + 'Vinicius</a></div>';
  else if (S.exemplo) h += '<div class="banner info"><span class="grow"><b>Exemplo com notas fictícias.</b> Nada aqui é gravado no banco.</span><button class="btn" type="button" data-act="voltar">Fechar exemplo</button></div>';
  else if (!S.readonly && pend) h += '<div class="banner"><span class="grow"><b>' + pend + (pend === 1 ? ' nota não publicada.' : ' notas não publicadas.') + '</b> O cliente ainda não vê essas notas.</span><button class="btn primary" type="button" data-act="publicar"' + (S.ocupado ? ' disabled' : '') + '>' + (S.ocupado ? 'Publicando…' : 'Publicar para o cliente') + '</button></div>';

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
  var stl = ((m.st && m.st.length) ? m.st : F.DEFAULT_ST).join('\n');
  var h = '<div class="office">';
  h += '<div class="card"><div><h2>Importar notas</h2><p class="note">Envie .zip ou XMLs de NF-e, NFC-e, CT-e e NFS-e (emitidas e recebidas) e os eventos de cancelamento. As notas vão para o banco e se somam às que já existem; uma nota repetida é substituída pela versão nova.</p></div>' +
    '<label class="drop" id="drop" for="files"><b>' + I.up + ' Arraste os arquivos aqui</b><span class="small">ou clique para escolher · .zip ou .xml</span></label><input id="files" type="file" accept=".zip,.xml" multiple hidden>';
  if (imp.lendo) h += '<div class="note">Lendo… ' + imp.arquivos + ' arquivos</div>';
  if (imp.gravando) h += '<div class="note">' + (imp.xml ? 'Guardando os XMLs originais… ' : 'Gravando no banco… ') + imp.gravadas + ' de ' + imp.total + '</div>';
  if (imp.feito) h += '<div class="stats"><div class="stat"><div class="v num">' + imp.arquivos + '</div><div class="k">arquivos lidos</div></div><div class="stat"><div class="v num">' + imp.notas + '</div><div class="k">notas da empresa</div></div><div class="stat"><div class="v num">' + imp.canc + '</div><div class="k">canceladas</div></div><div class="stat"><div class="v num">' + (imp.terceiros + imp.erros) + '</div><div class="k">ignoradas</div></div></div>';
  h += '<div class="row"><div class="field"><label for="cnpj">CNPJ do cliente</label><input id="cnpj" value="' + esc(fmtCnpj(m.cnpj)) + '" disabled></div><div class="field"><label for="nome">Razão social</label><input id="nome" value="' + esc(m.nome || '') + '"' + (S.exemplo ? ' disabled' : '') + '></div></div>';
  var seg = m.segmento || 'autopecas', auto = seg === 'autopecas';
  h += '<div class="row"><div class="field"><label for="segm">Segmento</label><select id="segm"' + (S.exemplo ? '' : '') + '>' + SEGMENTOS.map(function (x) { return '<option value="' + x[0] + '"' + (seg === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></div>' +
    '<div class="field"><label for="regm">Regime tributário</label><select id="regm">' + REGIMES.map(function (x) { return '<option value="' + x[0] + '"' + ((m.regime || 'real') === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></div>' +
    '<button class="btn" type="button" data-act="salvarSeg">Salvar e recalcular</button></div>';
  h += '<p class="note">' + (auto ? 'Pneus e autopeças: PIS/COFINS pela lista de monofásicos abaixo (Lei 10.485/2002) e auditoria da saída da ST em 01/10/2026.' : 'PIS/COFINS pelas regras da aba Classificação fiscal (monofásicos, alíquota zero da cesta básica e ST), mais a lista abaixo. Produtos comprados entram como revenda. As notas de venda são conferidas com o ICMS esperado de cada produto em SP, e as diferenças viram pendências.') +
    ((m.regime || 'real') === 'presumido' ? ' Lucro Presumido: PIS 0,65% e COFINS 3% cumulativos, sem créditos.' : (m.regime || 'real') === 'simples' ? ' Simples Nacional: o painel mostra a receita separada para o PGDAS-D (monofásica, ST e tributada), sem débito e crédito.' : ' Lucro Real: PIS 1,65% e COFINS 7,6% não cumulativos, com créditos.') + '</p>';
  h += '<details><summary>' + (auto ? 'Listas de NCM: monofásicos e saída da ST' : 'Monofásicos adicionais da empresa') + '</summary><div style="display:flex;flex-direction:column;gap:12px;margin-top:10px">' +
    '<div class="field"><label for="mono">' + (auto ? 'Monofásicos de PIS/COFINS (Lei 10.485/2002) — só afeta PIS/COFINS' : 'Monofásicos além das regras gerais (ex.: autopeças da Lei 10.485/2002)') + '</label><textarea id="mono" spellcheck="false">' + esc(mono) + '</textarea></div>' +
    '<p class="note">Um NCM por linha (pode ser só o início). Para valer só em destaques Ex da TIPI, escreva <code>40169990 ex:03,05</code>. Para NCM que depende da destinação, escreva <code>4009 ?</code>: o portal segue o CST da nota (02 ou 04 = monofásico) e avisa para conferir.</p>' +
    (auto ? '<div class="field"><label for="stl">Saíram da ST em 01/10/2026 (pneus e autopeças) — só afeta o ICMS</label><textarea id="stl" spellcheck="false">' + esc(stl) + '</textarea></div>' +
    '<p class="note">Um NCM por linha. Itens que vierem com CEST 01 (autopeças) ou 16 (pneus) entram automaticamente, mesmo fora da lista.</p>' +
    '<div class="row"><div class="field"><label for="corte">Início da tributação normal (fim da ST)</label><input id="corte" type="date" value="' + esc(m.corte || '2026-10-01') + '"></div><button class="btn" type="button" data-act="aplicarMono">Salvar e recalcular</button></div>'
    : '<div class="row"><button class="btn" type="button" data-act="aplicarMono">Salvar e recalcular</button></div>') + '</div></details>';
  h += blocoExcluirPeriodo();
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

/* ---------- excluir notas de um período ---------- */
function notasNoPeriodo(ini, fim) { return S.emp.notas.filter(function (n) { return n.dt >= ini && n.dt <= fim; }); }
function blocoExcluirPeriodo() {
  var meses = {}; S.emp.notas.forEach(function (n) { var m = n.dt.slice(0, 7); meses[m] = (meses[m] || 0) + 1; });
  var lista = Object.keys(meses).sort();
  var x = S.excl || {}, h = '<details' + (x.aberto ? ' open' : '') + ' id="dExcl"><summary>Excluir notas de um período</summary><div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">' +
    '<p class="note">Use quando vieram notas de um período que não entra no trabalho, por exemplo setembro para um cliente que começa em outubro. As notas, os XMLs e as anotações do período são apagados do banco. As demais notas não mudam.</p>';
  if (!lista.length) return h + '<p class="small">Nenhuma nota importada.</p></div></details>';
  h += '<div class="row" style="flex-wrap:wrap;gap:10px;align-items:flex-end"><div class="field" style="max-width:220px"><label for="exMes">Mês</label><select id="exMes"><option value="">Escolher datas…</option>' +
    lista.map(function (m) { return '<option value="' + m + '"' + (x.mes === m ? ' selected' : '') + '>' + mesNome(m).charAt(0).toUpperCase() + mesNome(m).slice(1) + ' (' + meses[m] + (meses[m] === 1 ? ' nota' : ' notas') + ')</option>'; }).join('') + '</select></div>' +
    '<div class="field" style="max-width:160px"><label for="exIni">De</label><input type="date" id="exIni" value="' + esc(x.ini || '') + '"></div><div class="field" style="max-width:160px"><label for="exFim">Até</label><input type="date" id="exFim" value="' + esc(x.fim || '') + '"></div>' +
    '<button class="btn danger" type="button" data-act="exclPrever">Excluir…</button></div>';
  if (x.confirmar) {
    var alvo = notasNoPeriodo(x.ini, x.fim);
    h += alvo.length ? '<div class="confirm"><span>Excluir <b>' + alvo.length + (alvo.length === 1 ? ' nota' : ' notas') + '</b> de ' + brFull(x.ini) + ' a ' + brFull(x.fim) + '? Não dá para desfazer; para trazer de volta, é preciso importar os XMLs de novo.</span><button class="btn danger" type="button" data-act="exclSim"' + (S.ocupado ? ' disabled' : '') + '>' + (S.ocupado ? 'Excluindo…' : 'Excluir definitivamente') + '</button><button class="btn" type="button" data-act="exclNao">Cancelar</button></div>'
      : '<p class="small">Nenhuma nota entre ' + brFull(x.ini) + ' e ' + brFull(x.fim) + '.</p>';
  }
  return h + '</div></details>';
}
async function excluirPeriodo() {
  var x = S.excl, e = S.emp; if (!x || !x.ini || !x.fim) return;
  var alvo = notasNoPeriodo(x.ini, x.fim); if (!alvo.length) return;
  S.ocupado = true; renderOffice();
  try {
    var n = S.exemplo ? alvo.length : await B.excluirPeriodo(e.meta.cnpj, x.ini, x.fim);
    var fora = {}; alvo.forEach(function (a) { fora[a.ch] = 1; });
    e.notas = e.notas.filter(function (a) { return !fora[a.ch]; });
    Object.keys(fora).forEach(function (k) { delete e.pub[k]; if (e.xmls) delete e.xmls[k]; if (e.acomp) delete e.acomp[k]; });
    S.excl = { aberto: true }; S.ocupado = false; S.periodo = 'all';
    recalcular(); render();
    toast((n === 1 ? '1 nota excluída' : n + ' notas excluídas') + ' do período de ' + brFull(x.ini) + ' a ' + brFull(x.fim) + '.');
  } catch (err) { S.ocupado = false; renderOffice(); toast('Não foi possível excluir: ' + erroTexto(err)); }
}

/* ---------- painel principal ---------- */
function semanaCard(w) {
  var t = F.somaDias(S.res.dias, w.dias), n = docs(t);
  var pend = S.res.pend.filter(function (p) { return w.dias.indexOf(p.dt) >= 0 && p.sev !== 'info' && !resolvida(p.ch); }).length;
  return '<button type="button" class="pcard" data-per="w:' + w.ini + '" aria-pressed="' + (S.periodo === 'w:' + w.ini) + '"><span class="t">Semana ' + w.num + '</span><span class="d num">' + br(w.ini) + ' a ' + br(w.fim) + '</span><span class="m">' + n + (n === 1 ? ' doc' : ' docs') + (pend ? ' · <span class="dot"></span>' + pend + ' pend.' : '') + '</span></button>';
}
function mesCard(m) {
  var t = F.somaDias(S.res.dias, m.dias);
  var pend = S.res.pend.filter(function (p) { return p.dt.slice(0, 7) === m.mes && p.sev !== 'info' && !resolvida(p.ch); }).length;
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
  var tit = $('titEmp'); if (tit) tit.textContent = nome;
  var atualiz = S.readonly && e.meta.publicado ? '. Atualizado em ' + new Date(e.meta.publicado).toLocaleDateString('pt-BR') : '';
  if (!S.res) { sub.innerHTML = 'CNPJ ' + esc(fmtCnpj(e.meta.cnpj)) + ', ainda sem notas' + atualiz; return; }
  var ds = diasSel(), lbl = 'Todo o período';
  if (S.periodo[0] === 'w') { var w = S.per.semanas.filter(function (x) { return 'w:' + x.ini === S.periodo; })[0]; lbl = 'Semana ' + w.num + ' de ' + mesNome(w.mes); }
  if (S.periodo[0] === 'm') lbl = mesNome(S.periodo.slice(2));
  sub.innerHTML = 'CNPJ ' + esc(fmtCnpj(e.meta.cnpj)) + '. <b>' + esc(lbl) + '</b>' + (ds.length ? ', de ' + brFull(ds[0]) + ' a ' + brFull(ds[ds.length - 1]) : '') + atualiz;
}

function renderMain() {
  renderHeaderSub();
  var el = $('main'); if (!el) return;
  if (!S.res) {
    el.innerHTML = '<div class="card"><div class="empty"><h2>Sem notas ainda</h2><p class="note">Importe os XMLs na área do escritório para ver a apuração e as pendências.</p>' + (S.readonly ? '' : '<button class="btn primary" type="button" data-modo="escritorio">Importar XMLs</button>') + '</div></div>';
    return;
  }
  var ds = diasSel(), T = F.somaDias(S.res.dias, ds);
  var pendTodas = S.res.pend.filter(function (p) { return ds.indexOf(p.dt) >= 0; });
  var pend = pendTodas.filter(function (p) { return !resolvida(p.ch); });
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
  h += '<div class="toolbar"><div class="seg" role="group" aria-label="Agrupar períodos"><button type="button" data-grupo="semana" aria-pressed="' + (S.grupo === 'semana') + '">Semanas</button><button type="button" data-grupo="mes" aria-pressed="' + (S.grupo === 'mes') + '">Meses</button></div><span class="small grow">A apuração oficial é mensal. Dia e semana servem para acompanhamento.</span><div class="row no-print" style="gap:8px"><button class="btn" type="button" data-act="excel"' + (S.gerando ? ' disabled' : '') + '>' + I.up.replace('M12 16V4M7 9l5-5 5 5', 'M12 4v12M7 11l5 5 5-5') + (S.gerando ? 'Gerando…' : 'Baixar Excel') + '</button><button class="btn" type="button" data-act="imprimirPainel">Imprimir</button></div></div>';

  h += '<div class="mov card"><div><span class="small">Vendas</span><b class="num">' + m0(T.vendas) + '</b><span class="small">' + T.nS + ' notas de saída</span></div>' +
    '<div><span class="small">Serviços prestados</span><b class="num">' + m0(T.servPrest) + '</b><span class="small">' + T.nSP + ' NFS-e · ISS a recolher ' + m0(T.issDev) + '</span></div>' +
    '<div><span class="small">Compras</span><b class="num">' + m0(T.compras + T.compOut + T.compIns) + '</b><span class="small">' + T.nE + ' notas de entrada' + (T.stE ? ' · ST pago ' + m0(T.stE) : '') + (T.compIns ? ' · ' + m0(T.compIns) + ' de insumo' : '') + (T.compOut ? ' · ' + m0(T.compOut) + ' de uso/ativo' : '') + '</span></div>' +
    '<div><span class="small">Serviços e fretes tomados</span><b class="num">' + m0(T.servTom + T.freteTom) + '</b><span class="small">' + T.nST + ' NFS-e · ' + T.nCT + ' CT-e' + (T.nCX ? ' · ' + T.nCX + ' CT-e sem ser tomadora' : '') + '</span></div></div>';
  if (regimeEmp() !== 'simples') h += '<div class="kpi-tit"><span class="eyebrow">Como as notas foram emitidas</span></div>';
  h += '<div class="kpis">';
  if (regimeEmp() === 'simples') {
    var recT = T.vendas + T.servPrest, recSeg = T.rMono + T.rSTpc;
    h += '<div class="card kpi kpi-simples"><div class="lbl"><span class="badge">' + I.doc + '</span>Receita para o PGDAS-D (Simples Nacional)</div>' +
      '<div><div class="big num">' + m0(recT) + '</div><div class="state">receita de vendas e serviços no período</div></div>' +
      '<dl class="num"><dt>Com ICMS por substituição tributária (segregar)</dt><dd>' + m0(T.rSTicms) + '</dd><dt>PIS/COFINS monofásico (segregar)</dt><dd>' + m0(T.rMono) + '</dd>' + (T.rSTpc ? '<dt>PIS/COFINS por ST (segregar)</dt><dd>' + m0(T.rSTpc) + '</dd>' : '') +
      '<dt>Alíquota zero da cesta básica (tributada normalmente no DAS)</dt><dd>' + m0(T.rZero) + '</dd><dt>Receita sem segregação de PIS/COFINS</dt><dd>' + m0(recT - recSeg) + '</dd><dt>ICMS destacado nas vendas</dt><dd>' + m0(T.icmsD) + '</dd></dl></div>';
  } else {
  var A = comparativo(ds, T, S.cmpAlertas).atual;
  h += kpi('ICMS', I.doc, A.icmsD, A.icmsC, (T.icmsUso || T.ciap) ? '<dt>Uso, insumo e ativo (sem crédito)</dt><dd>' + m0(T.icmsUso + T.ciap) + '</dd>' : '');
  h += kpi('PIS', I.pct, A.pisD, A.pisC, '<dt>Destacado nas vendas</dt><dd>' + m0(T.pisDest) + '</dd>');
  h += kpi('COFINS', I.pct, A.cofD, A.cofC, '<dt>Destacado nas vendas</dt><dd>' + m0(T.cofDest) + '</dd>');
  }
  h += '<div class="card kpi' + (erros.length ? ' alert' : '') + '"><div class="lbl"><span class="badge">' + I.alert + '</span>Pendências</div><div><div class="big num">' + erros.length + '</div><div class="state">' + (erros.length === 1 ? 'erro' : 'erros') + ' · ' + alertas.length + ' ' + (alertas.length === 1 ? 'alerta' : 'alertas') + '</div></div>' +
    '<dl class="num"><dt>Erros de ICMS</dt><dd' + (eI ? ' class="errtxt"' : '') + '>' + eI + '</dd><dt>Erros de PIS/COFINS</dt><dd' + (eP ? ' class="errtxt"' : '') + '>' + eP + '</dd>' + (eS ? '<dt>Erros de ISS</dt><dd class="errtxt">' + eS + '</dd>' : '') + '<dt>Impacto estimado</dt><dd>' + m0(impacto) + '</dd></dl></div>';
  h += '</div>';
  if (regimeEmp() !== 'simples') {
    var cc = comparativo(ds, T, S.cmpAlertas), a0 = cc.atual, c0 = cc.corr;
    var dI = (c0.icmsD - c0.icmsC) - (a0.icmsD - a0.icmsC), dP = (c0.pisD - c0.pisC) - (a0.pisD - a0.pisC), dC = (c0.cofD - c0.cofC) - (a0.cofD - a0.cofC), dT = dI + dP + dC;
    var linhaD = function (nome, v) { return '<dt>' + nome + '</dt><dd' + (Math.abs(v) < 0.005 ? '' : v > 0 ? ' class="errtxt"' : ' class="credor"') + '>' + (Math.abs(v) < 0.005 ? '–' : (v > 0 ? '+' : '') + m0(v)) + '</dd>'; };
    h += '<div class="kpi-tit kpi-tit-corr"><span class="eyebrow">Após corrigir as pendências</span><div class="chips" role="group" aria-label="O que corrigir">' + [[false, 'Só os erros'], [true, 'Erros e alertas']].map(function (o) { return '<button type="button" class="chip" data-cmpal="' + o[0] + '" aria-pressed="' + (!!S.cmpAlertas === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div></div>';
    h += '<div class="kpis kpis-corr">' + kpi('ICMS', I.doc, c0.icmsD, c0.icmsC, '') + kpi('PIS', I.pct, c0.pisD, c0.pisC, '') + kpi('COFINS', I.pct, c0.cofD, c0.cofC, '') +
      '<div class="card kpi"><div class="lbl"><span class="badge">' + I.pct + '</span>Impacto das correções</div><div><div class="big num' + (dT > 0.004 ? ' errtxt' : dT < -0.004 ? ' credor' : '') + '">' + (dT > 0.004 ? '+' : '') + m0(dT) + '</div><div class="state">' + (Math.abs(dT) < 0.005 ? 'sem mudança nos tributos' : dT > 0 ? 'a mais nos tributos (débito maior ou crédito menor)' : 'a menos nos tributos (débito menor ou crédito maior)') + '</div></div>' +
      '<dl class="num">' + linhaD('ICMS', dI) + linhaD('PIS', dP) + linhaD('COFINS', dC) + '</dl></div></div>';
    h += '<p class="small" style="margin-top:-8px">Detalhes por ocorrência na aba <button type="button" class="link" data-tab="comparativo">Antes × depois</button>. Pendências "Conferida, sem ação" ficam como estão.</p>';
  }


  var vd = $('veredito');
  if (vd) {
    var frase;
    if (regimeEmp() === 'simples') frase = 'No período, a receita de vendas e serviços soma ' + m0(T.vendas + T.servPrest) + ', sendo ' + m0(T.rMono + T.rSTpc) + ' de PIS/COFINS monofásico ou com ST e ' + m0(T.rSTicms) + ' com ICMS por substituição tributária, para segregar no PGDAS-D.';
    else {
      var cv = comparativo(ds, T, S.cmpAlertas), sI = cv.atual.icms, sPC = cv.atual.pis + cv.atual.cof, dif = (cv.corr.icms + cv.corr.pis + cv.corr.cof) - (cv.atual.icms + cv.atual.pis + cv.atual.cof);
      frase = 'No período, o ICMS fecha ' + (sI < 0 ? 'com saldo credor de ' + m0(-sI) : 'com ' + m0(sI) + ' a recolher') + ' e PIS e COFINS ' + (sPC < 0 ? 'com saldo credor de ' + m0(-sPC) : 'somam ' + m0(sPC) + ' a recolher') + ', como as notas foram emitidas.';
      if (erros.length) frase += ' Encontramos ' + erros.length + (erros.length === 1 ? ' erro' : ' erros') + ' nas notas' + (Math.abs(dif) >= 0.01 ? '; corrigindo, os tributos ' + (dif < 0 ? 'diminuem ' + m0(-dif) : 'aumentam ' + m0(dif)) : '') + '.';
      else frase += ' Nenhum erro em aberto.';
    }
    vd.innerHTML = '<p>' + frase + '</p>' + (erros.length + alertas.length ? '<button type="button" class="btn claro" data-tab="pendencias">Ver o que corrigir</button>' : '');
  }
  var notasF = S.res.notas.filter(function (n) { return ds.indexOf(n.dt) >= 0 && bate(S.q, [n.n, n.ch, n.parte.n, n.parte.c]); });
  var nPend = Object.values(S.res.produtos).filter(function (p) { return p.classe === 'pendente'; }).length;
  var tabs = [['apuracao', 'Apuração', ''], ['comparativo', 'Antes × depois', ''], ['pendencias', 'Pendências', '<span class="count' + (erros.length ? ' err' : '') + '">' + (erros.length + alertas.length) + '</span>'],
    ['notas', 'Notas', '<span class="count">' + notasF.length + '</span>'], ['produtos', 'Produtos', '<span class="count' + (nPend ? ' err' : '') + '">' + (nPend ? nPend + ' sem classe' : Object.keys(S.res.produtos).length) + '</span>'], ['classif', 'Classificação fiscal', ''], ['servicos', 'Serviços e fretes', (function () { var n = Object.values(S.res.servicos).filter(function (x) { return x.classe === 'pendente'; }).length; return n ? '<span class="count">' + n + ' sem classe</span>' : ''; })()], ['reforma', 'IBS/CBS 2026', '']];
  h += '<div class="card painel-abas"><div class="tabs" role="tablist">' + tabs.map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + t[1] + t[2] + '</button>'; }).join('') + '</div><div class="pbody">';
  if (S.tab === 'apuracao') h += tabApuracao(ds, T);
  else if (S.tab === 'comparativo') h += tabComparativo(ds, T);
  else if (S.tab === 'pendencias') h += tabPendencias(pendTodas);
  else if (S.tab === 'notas') h += tabNotas(notasF);
  else if (S.tab === 'produtos') h += tabProdutos();
  else if (S.tab === 'classif') h += tabClassif(ds);
  else if (S.tab === 'servicos') h += tabServicos(ds, T);
  else h += tabReforma(ds, T);
  h += '</div></div>';
  h += '<p class="legal">' + textoLegal() + '</p>';
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
  S._gs = gs; S._gds = ds;
  if (!gs.length) return '';
  var max = 0; gs.forEach(function (g) { max = Math.max(max, g.t.icmsD, g.t.icmsC); });
  var larg = ($('chart') && $('chart').clientWidth) || (($('main') && $('main').clientWidth) || 1000) - 38;
  var sc = escala(max), W = Math.max(300, Math.round(larg)), H = 260, L = 56, R = 12, Tp = 12, B = 30, iw = W - L - R, ih = H - Tp - B;
  var gw = iw / gs.length, bw = Math.max(6, Math.min(44, gw * 0.26)), gap = 3;
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
  return '<div class="card chart-card"><div class="chart-head"><div><h3>ICMS por ' + (S.periodo[0] === 'w' ? 'dia' : 'semana') + '</h3><div class="small">Débito das saídas e crédito das entradas. Passe o mouse ou toque numa barra para ver o saldo.</div></div>' +
    '<div class="legend"><span><i style="background:var(--s1)"></i>Débito</span><span><i style="background:var(--s2)"></i>Crédito</span></div></div>' +
    '<div class="chart" id="chart">' + s + '<div class="tip" id="tip" hidden></div></div></div>';
}
// ao mudar a largura da janela, redesenha o gráfico na nova largura (senão o texto encolhe ou estica)
var _rz;
window.addEventListener('resize-desligado', function () {
  clearTimeout(_rz);
  _rz = setTimeout(function () {
    var box = $('chart'); if (!box || !S._gds) return;
    var card = box.closest('.chart-card'), tmp = document.createElement('div');
    tmp.innerHTML = grafico(S._gds); card.replaceWith(tmp.firstChild); bindChart();
  }, 150);
});
function bindChart() {
  var box = $('chart'); if (!box) return;
  var tip = $('tip');
  var mostrar = function (ev) {
    var r = ev.target.closest && ev.target.closest('.hit');
    if (!r) { tip.hidden = true; return; }
    var g = S._gs[+r.getAttribute('data-g')], t = g.t, saldo = t.icmsD - t.icmsC;
    tip.innerHTML = '<b>' + esc(g.titulo) + '</b><div class="r"><span><i style="background:var(--s1)"></i>Débito</span><span class="num">' + m0(t.icmsD) + '</span></div><div class="r"><span><i style="background:var(--s2)"></i>Crédito</span><span class="num">' + m0(t.icmsC) + '</span></div><div class="r" style="margin-top:4px;padding-top:4px;border-top:1px solid rgba(127,127,127,.4)"><span>' + (saldo >= 0 ? 'A recolher' : 'Saldo credor') + '</span><span class="num">' + m0(Math.abs(saldo)) + '</span></div>';
    tip.hidden = false;
    var b = box.getBoundingClientRect(), x = ev.clientX - b.left + box.scrollLeft + 14, yy = ev.clientY - b.top + 10;
    if (x + 190 > box.scrollWidth) x -= 210;
    tip.style.left = Math.max(0, x) + 'px'; tip.style.top = yy + 'px';
  };
  box.addEventListener('mousemove', mostrar);
  box.addEventListener('click', mostrar);
  box.addEventListener('mouseleave', function () { tip.hidden = true; });
}

function textoLegal() {
  var seg = (S.emp.meta.segmento || 'autopecas'), reg = regimeEmp();
  var icms = seg === 'autopecas' ? 'ICMS/SP com tributação normal de pneus e autopeças a partir de 01/10/2026 (Portaria SRE 34/2026)' : 'ICMS/SP conforme o RICMS/SP e a Portaria CAT 68/2019 (substituição tributária), com as isenções e a redução da cesta básica vigentes';
  var pc = reg === 'simples' ? 'Simples Nacional (LC 123/2006), com a receita monofásica e com ST segregada no PGDAS-D' : reg === 'presumido' ? 'PIS/COFINS cumulativo do Lucro Presumido (Lei 9.718/1998), com ICMS excluído da base (Tema 69/STF)' : 'PIS/COFINS não cumulativo do Lucro Real (Leis 10.637/2002 e 10.833/2003), com ICMS excluído da base do débito (Tema 69/STF) e do crédito (Lei 14.592/2023)';
  var mono = seg === 'autopecas' ? 'produtos monofásicos conforme a Lei 10.485/2002' : 'monofásicos e alíquota zero conforme as Leis 10.147/2000, 10.485/2002, 10.865/2004, 10.925/2004 e 13.097/2015';
  return 'Documentos lidos: NF-e, NFC-e, CT-e e NFS-e do padrão nacional. Base: ' + icms + '; ' + pc + '; ' + mono + '. Valores apurados a partir dos XMLs; não substituem a escrituração (SPED) nem a apuração oficial.';
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
function visaoApur(dias, t) {
  var c = comparativo(dias, t, S.cmpAlertas), v = S.apVisao === 'corr' ? c.corr : c.atual, o = {};
  for (var k in t) o[k] = t[k];
  ['icmsD', 'icmsC', 'pisD', 'pisC', 'cofD', 'cofC'].forEach(function (k) { o[k] = v[k]; });
  return o;
}
function tabApuracao(ds, T) {
  var rows = linhasApuracao(ds).map(function (r) { var t = F.somaDias(S.res.dias, r.dias); return { lbl: r.lbl, t: regimeEmp() === 'simples' ? t : visaoApur(r.dias, t) }; });
  if (regimeEmp() !== 'simples') T = visaoApur(ds, T);
  var h = '<div class="toolbar"><div class="seg" role="group" aria-label="Detalhar por"><button type="button" data-det="dia" aria-pressed="' + (S.det === 'dia') + '">Dia</button><button type="button" data-det="semana" aria-pressed="' + (S.det === 'semana') + '">Semana</button><button type="button" data-det="mes" aria-pressed="' + (S.det === 'mes') + '">Mês</button></div>' + (regimeEmp() === 'simples' ? '' : '<div class="seg" role="group" aria-label="Visão"><button type="button" data-apv="emit" aria-pressed="' + (S.apVisao !== 'corr') + '">Como emitidas</button><button type="button" data-apv="corr" aria-pressed="' + (S.apVisao === 'corr') + '">Após as correções</button></div>') + '<span class="small">Valores entre parênteses são saldo credor.</span></div>';
  h += '<div class="tscroll"><table><thead><tr class="grp"><th></th><th></th><th></th><th colspan="3">ICMS</th><th colspan="3">PIS</th><th colspan="3">COFINS</th></tr><tr><th>Período</th><th class="r">Vendas</th><th class="r">Compras</th><th class="r">Débito</th><th class="r">Crédito</th><th class="r">Saldo</th><th class="r">Débito</th><th class="r">Crédito</th><th class="r">Saldo</th><th class="r">Débito</th><th class="r">Crédito</th><th class="r">Saldo</th></tr></thead><tbody>';
  rows.forEach(function (r) {
    var t = r.t;
    h += '<tr><td style="white-space:nowrap;text-transform:' + (S.det === 'mes' ? 'capitalize' : 'none') + '">' + esc(r.lbl) + '<div class="small">' + (t.nS + t.nSP) + ((t.nS + t.nSP) === 1 ? ' saída · ' : ' saídas · ') + (t.nE + t.nST + t.nCT) + ((t.nE + t.nST + t.nCT) === 1 ? ' entrada' : ' entradas') + '</div></td><td class="r num">' + m0(t.vendas) + '</td><td class="r num">' + m0(t.compras + t.compOut + t.compIns) + (t.compIns ? '<div class="small">insumo ' + m0(t.compIns) + '</div>' : '') + (t.compOut ? '<div class="small">uso/ativo ' + m0(t.compOut) + '</div>' : '') + '</td><td class="r num">' + m0(t.icmsD) + '</td><td class="r num">' + m0(t.icmsC) + '</td>' + saldoCell(t.icmsD - t.icmsC) + '<td class="r num">' + m0(t.pisD) + '</td><td class="r num">' + m0(t.pisC) + '</td>' + saldoCell(t.pisD - t.pisC) + '<td class="r num">' + m0(t.cofD) + '</td><td class="r num">' + m0(t.cofC) + '</td>' + saldoCell(t.cofD - t.cofC) + '</tr>';
  });
  h += '</tbody><tfoot><tr><td>Total</td><td class="r num">' + m0(T.vendas) + '</td><td class="r num">' + m0(T.compras + T.compOut + T.compIns) + '</td><td class="r num">' + m0(T.icmsD) + '</td><td class="r num">' + m0(T.icmsC) + '</td>' + saldoCell(T.icmsD - T.icmsC) + '<td class="r num">' + m0(T.pisD) + '</td><td class="r num">' + m0(T.pisC) + '</td>' + saldoCell(T.pisD - T.pisC) + '<td class="r num">' + m0(T.cofD) + '</td><td class="r num">' + m0(T.cofC) + '</td>' + saldoCell(T.cofD - T.cofC) + '</tr></tfoot></table></div>';
  h += '<p class="note">' + (regimeEmp() === 'simples' ? 'Simples Nacional: PIS e COFINS vão no DAS; os valores de ICMS são os destacados nas notas. ' : S.apVisao === 'corr' ? 'Após as correções: a apuração como fica depois de corrigir as pendências (' + (S.cmpAlertas ? 'erros e alertas' : 'só os erros') + '; mude no topo do painel). ' : 'Como emitidas: ICMS destacado nas notas e PIS/COFINS como as notas foram emitidas, inclusive os erros. ') + 'Produtos monofásicos não geram débito nem crédito. Entradas de setembro com ST não geram crédito de ICMS: o imposto foi encerrado na retenção. Uso e consumo, insumo de serviço e ativo ficam fora do crédito de ICMS (ativo segue o CIAP, 1/48 por mês); insumo de serviço gera crédito de PIS/COFINS.</p>';
  return h;
}

/* ---------- classificação fiscal por NCM ---------- */
var UFS = ['SP', 'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'TO'];
var REGIMES = [['real', 'Lucro Real'], ['presumido', 'Lucro Presumido'], ['simples', 'Simples Nacional']];
function regimeEmp() { return (S.emp && S.emp.meta.regime) || 'real'; }
var SEGMENTOS = [['autopecas', 'Pneus e autopeças'], ['varejo', 'Varejo de alimentos (mercadinho)'], ['outros', 'Outros (comércio em geral)']];
function monoEmp() {
  if (!S._monoFn || S._monoFnDe !== S.emp) { var f = F.makeMono(cfgAtual().mono); S._monoFn = function (n) { return f(n) === 'mono'; }; S._monoFnDe = S.emp; }
  return S._monoFn;
}
function classifDe(ncm, cest, destino, uf, contrib, importado) {
  S._cls = S._cls || {}; var k = [ncm, cest, destino, uf, contrib, importado, regimeEmp()].join('|');
  if (!S._cls[k]) S._cls[k] = Regras.classificar({ ncm: ncm, cest: cest, destino: destino, uf: uf, contribuinte: contrib, regime: regimeEmp(), importado: importado, mono: monoEmp() });
  return S._cls[k];
}
function blocoClassif(nome, b, extra) {
  var r = b.regra;
  return '<div class="bloco cls"><div class="eyebrow">' + nome + '</div><b>' + esc(b.titulo) + '</b>' + (b.cst ? '<div class="small">CST/CSOSN ' + esc(b.cst) + (b.cClassTrib ? ' · cClassTrib ' + esc(b.cClassTrib) : '') + '</div>' : '') +
    '<div class="small" style="color:var(--ink)">' + esc(b.texto || '') + '</div>' + (extra || '') +
    (r ? '<div class="small"><b>' + esc(r.d) + '.</b> ' + esc(r.l) + (r.n ? '. ' + esc(r.n) : '') + '</div>' : '') +
    (b.cond ? '<span><span class="pill alerta">Conferir a descrição do produto</span></span>' : '') + '</div>';
}
function resultadoClassif(c) {
  if (c.erro) return '<p class="note">' + esc(c.erro) + '</p>';
  var stTxt = c.st.st === 'sim' ? '<b>Sujeito à ST em SP</b>' : c.st.st === 'cest' ? '<b>Depende do CEST</b>' : '<b>Fora da ST em SP</b>' + (c.st.regra && c.st.regra.desde ? ' desde ' + esc(c.st.regra.desde) : '');
  var stB = '<div class="bloco cls"><div class="eyebrow">ICMS-ST</div>' + stTxt + (c.st.regra ? '<div class="small"><b>' + esc(c.st.regra.d) + '.</b> ' + esc(c.st.regra.l) + (c.st.regra.n ? '. ' + esc(c.st.regra.n) : '') + '</div>' : '<div class="small">NCM fora dos segmentos de ST de SP. Confira se o fornecedor informa CEST.</div>') + '</div>';
  return '<div class="blocos">' + blocoClassif('PIS/COFINS', c.pc) + blocoClassif('ICMS', c.icms) + stB + blocoClassif('IPI', c.ipi) + blocoClassif('CBS/IBS', c.cbs) + '</div>';
}
var CST_ICMS_GRUPO = function (c) { c = String(c || ''); if (c.length === 3) return { '101': 'trib', '102': 'trib', '103': 'isento', '300': 'isento', '400': 'isento', '500': 'st', '900': 'trib', '201': 'st', '202': 'st', '203': 'st' }[c] || c; return { '00': 'trib', '20': 'red', '40': 'isento', '41': 'isento', '50': 'isento', '60': 'st', '10': 'st', '70': 'st', '30': 'st', '51': 'trib', '90': 'trib' }[c] || c; };
function esperadoIcms(c) { return c.icms.cst === '60' || c.icms.cst === '500' ? 'st' : c.icms.cst === '40' || c.icms.cst === '103' ? 'isento' : c.icms.cst === '20' ? 'red' : 'trib'; }
function produtosClassif(ds) {
  var mapa = {}, regime = regimeEmp();
  S.res.notas.forEach(function (r) {
    if (ds.indexOf(r.dt) < 0 || (r.tipo && r.tipo !== 'nfe')) return;
    var n = notaPorChave(r.ch); if (!n || !n.it) return;
    var venda = r.dir === 'S' && r.proprio, compra = r.dir === 'E' && !r.proprio;
    if (!venda && !compra) return;
    n.it.forEach(function (it) {
      var nat = F.natureza(it.cf); if (venda && nat !== 'venda') return; if (compra && nat !== 'venda') return;
      var k = venda ? 'V|' + (it.cp || it.x) + '|' + it.ncm : 'C|' + it.ncm + '|' + (it.x || '').slice(0, 30).toUpperCase();
      var g = mapa[k] || (mapa[k] = { k: k, venda: venda, x: it.x, cp: it.cp, ncm: it.ncm, cest: it.cest, n: 0, v: 0, cP: {}, cI: {}, carga: {}, div: [], cf: 0, uf: {}, forn: venda ? '' : r.parte.n });
      g.n++; g.v += it.vp - it.vd; if (it.cest && !g.cest) g.cest = it.cest;
      if (!venda) return;
      var cf = n.mod === '65' || n.dIE === '9', uf = n.dUF || 'SP', contrib = n.dIE === '1';
      if (cf) g.cf++;
      g.uf[uf] = 1;
      var c = classifDe(it.ncm, it.cest, cf ? 'cf' : 'revenda', uf, contrib, ['1', '2', '3', '8'].indexOf(String(it.o)) >= 0);
      if (c.erro) return;
      g.cP[it.cP || '–'] = 1; g.cI[it.cst || '–'] = 1;
      var base = it.vp - it.vd, carga = base > 0 ? Math.round(it.v / base * 1000) / 10 : 0; g.carga[carga] = 1;
      if (!g.c) g.c = c;
      // PIS/COFINS
      if (regime !== 'simples') {
        var esp = c.pc.cst, zeroE = esp === '04' || esp === '05' || esp === '06', zeroN = ['04', '05', '06', '07', '08', '09'].indexOf(it.cP) >= 0;
        if (zeroE !== zeroN && !c.pc.cond) g.div.push('pc');
      }
      // ICMS
      var ge = esperadoIcms(c), gn = CST_ICMS_GRUPO(it.cst);
      var desde = c.st.regra && c.st.regra.desde ? c.st.regra.desde.split('/').reverse().join('-') : '';
      if (desde && r.dt < desde) { if (gn !== 'st') g.div.push('icms'); return; } // antes da saída da ST, o certo era ST
      if (!c.icms.cond && !(c.st.st === 'cest')) {
        if (ge !== gn) { if (!(ge === 'red' && gn === 'trib' && Math.abs(carga - 7) < 0.6)) g.div.push('icms'); }
        else if ((ge === 'trib' || ge === 'red') && c.icms.carga && carga && Math.abs(carga - c.icms.carga) > 0.6 && !(c.st.st === 'nao' && false)) g.div.push('icms');
      }
    });
  });
  return Object.values(mapa).map(function (g) {
    if (!g.c) g.c = classifDe(g.ncm, g.cest, 'cf', 'SP', false, false);
    g.div = g.div.filter(function (d, i, a) { return a.indexOf(d) === i; });
    return g;
  });
}
function tabClassif(ds) {
  var q = S.cq || { ncm: '', cest: '', destino: 'cf', uf: 'SP', contrib: false, importado: false };
  var h = '<p class="note">Classificação de PIS/COFINS, ICMS, ICMS-ST, IPI e CBS/IBS por NCM, para revenda pelo comércio em SP. As regras foram revisadas em ' + Regras.REVISAO + ' pela legislação federal (Leis 10.147/2000, 10.865/2004, 10.925/2004, 13.097/2015 e LC 214/2025) e pelo RICMS/SP. É orientação: casos marcados com "Conferir" dependem da descrição do produto.</p>';
  h += '<form id="fClassif" class="card" style="padding:14px;display:flex;flex-direction:column;gap:10px"><h3>Consultar um NCM</h3><div class="row" style="flex-wrap:wrap;gap:10px;align-items:flex-end">' +
    '<div class="field" style="max-width:150px"><label for="cqNcm">NCM</label><input id="cqNcm" inputmode="numeric" maxlength="10" placeholder="0000.00.00" value="' + esc(q.ncm) + '" required></div>' +
    '<div class="field" style="max-width:130px"><label for="cqCest">CEST (opcional)</label><input id="cqCest" inputmode="numeric" maxlength="9" value="' + esc(q.cest) + '"></div>' +
    '<div class="field" style="max-width:200px"><label for="cqDest">Para quem vende</label><select id="cqDest"><option value="cf"' + (q.destino === 'cf' ? ' selected' : '') + '>Consumidor final</option><option value="revenda"' + (q.destino === 'revenda' ? ' selected' : '') + '>Empresa (revenda ou uso)</option></select></div>' +
    '<div class="field" style="max-width:110px"><label for="cqUf">UF de destino</label><select id="cqUf">' + UFS.map(function (u) { return '<option' + (q.uf === u ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select></div>' +
    '<div class="field" style="max-width:190px"><label for="cqReg">Regime da empresa</label><select id="cqReg">' + REGIMES.map(function (r) { return '<option value="' + r[0] + '"' + ((q.regime || regimeEmp()) === r[0] ? ' selected' : '') + '>' + r[1] + '</option>'; }).join('') + '</select></div>' +
    '<label class="check"><input type="checkbox" id="cqContrib"' + (q.contrib ? ' checked' : '') + '> Comprador é contribuinte do ICMS</label>' +
    '<label class="check"><input type="checkbox" id="cqImp"' + (q.importado ? ' checked' : '') + '> Mercadoria importada</label>' +
    '<button class="btn primary" type="submit">Consultar</button></div>';
  if (q.ncm) h += resultadoClassif(Regras.classificar({ ncm: q.ncm, cest: q.cest, destino: q.destino, uf: q.uf, contribuinte: q.contrib, regime: q.regime || regimeEmp(), importado: q.importado, mono: monoEmp() }));
  h += '</form>';

  var lista = produtosClassif(ds);
  var vend = lista.filter(function (g) { return g.venda; }), comp = lista.filter(function (g) { return !g.venda; });
  var fonte = S.fCls || 'venda', fdiv = S.fClsDiv || 'todos';
  var base = fonte === 'venda' ? vend : comp;
  var cnt = { todos: base.length, div: base.filter(function (g) { return g.div.length; }).length, conf: base.filter(function (g) { return g.c.pc.cond || g.c.icms.cond || g.c.cbs.cond || g.c.st.st === 'cest'; }).length };
  var f = base.filter(function (g) { return (fdiv === 'todos' || (fdiv === 'div' ? g.div.length : (g.c.pc.cond || g.c.icms.cond || g.c.cbs.cond || g.c.st.st === 'cest'))) && bate(S.q, [g.x, g.cp, g.ncm, g.cest, g.forn]); });
  f.sort(function (a, b) { return b.div.length - a.div.length || b.v - a.v; });
  h += '<div><h3>Produtos da empresa no período</h3><p class="note" style="margin-top:4px">' + (fonte === 'venda' ? 'Como a empresa configurou cada produto nas notas de venda (CST e alíquota que saíram nas NF-e e NFC-e), comparado com a classificação esperada. Divergência indica cadastro a corrigir no sistema emissor.' : 'Produtos comprados, com a classificação que deveriam ter na revenda a consumidor final em SP.') + '</p></div>';
  h += '<div class="toolbar"><div class="chips" role="group" aria-label="Origem">' + [['venda', 'Vendidos (' + vend.length + ')'], ['compra', 'Comprados (' + comp.length + ')']].map(function (c) { return '<button type="button" class="chip" data-fcls="' + c[0] + '" aria-pressed="' + (fonte === c[0]) + '">' + c[1] + '</button>'; }).join('') + '</div>' +
    '<div class="chips" role="group" aria-label="Filtro">' + [['todos', 'Todos (' + cnt.todos + ')'], ['div', 'Com divergência (' + cnt.div + ')'], ['conf', 'A conferir (' + cnt.conf + ')']].filter(function (c) { return fonte === 'venda' || c[0] !== 'div'; }).map(function (c) { return '<button type="button" class="chip" data-fclsdiv="' + c[0] + '" aria-pressed="' + (fdiv === c[0]) + '">' + c[1] + '</button>'; }).join('') + '</div></div>';
  if (!f.length) return h + '<div class="empty"><p class="note">Nenhum produto neste filtro.</p></div>';
  h += '<div class="tscroll"><table><thead><tr><th>Produto</th><th>NCM / CEST</th><th class="r">Valor</th><th>PIS/COFINS</th><th>ICMS</th><th>ST em SP</th><th>CBS/IBS</th>' + (fonte === 'venda' ? '<th>Situação</th>' : '') + '</tr></thead><tbody>';
  f.slice(0, S.imprimindo ? 1e9 : 400).forEach(function (g) {
    var c = g.c, dP = g.div.indexOf('pc') >= 0, dI = g.div.indexOf('icms') >= 0;
    var nota = function (obj) { return Object.keys(obj).join(', '); };
    h += '<tr><td>' + esc(g.x) + '<div class="small">' + (g.venda ? 'Cód. ' + esc(g.cp || '–') : esc(g.forn)) + '</div></td><td class="mono" style="white-space:nowrap"><button type="button" class="link" data-cncm="' + esc(g.ncm) + '" data-ccest="' + esc(g.cest || '') + '">' + esc(g.ncm) + '</button>' + (g.cest ? '<div class="small">' + esc(g.cest) + '</div>' : '') + '</td>' +
      '<td class="r num">' + m0(g.v) + '<div class="small">' + g.n + (g.n === 1 ? ' item' : ' itens') + '</div></td>' +
      '<td' + (dP ? ' class="errcell"' : '') + '><b>CST ' + esc(c.pc.cst) + '</b><div class="small">' + esc({ mono: 'Monofásico', st: 'ST', zero: 'Alíquota zero', normal: 'Tributado' }[c.pc.trat]) + '</div>' + (g.venda ? '<div class="small">Na nota: ' + esc(nota(g.cP)) + '</div>' : '') + '</td>' +
      '<td' + (dI ? ' class="errcell"' : '') + '><b>' + esc(c.icms.titulo.replace('Substituição tributária: ICMS já recolhido na compra', 'ST (CST 60)')) + '</b>' + (g.venda ? '<div class="small">Na nota: CST ' + esc(nota(g.cI)) + ' · ' + esc(Object.keys(g.carga).map(function (x) { return String(x).replace('.', ',') + '%'; }).join(', ')) + '</div>' : '') + '</td>' +
      '<td>' + (c.st.st === 'sim' ? '<span class="pill alerta">Sim</span>' : c.st.st === 'cest' ? '<span class="pill info">Depende do CEST</span>' : '<span class="small">Não</span>') + '</td>' +
      '<td>' + esc(c.cbs.titulo) + '<div class="small">cClassTrib ' + esc(c.cbs.cClassTrib) + '</div></td>' +
      (g.venda ? '<td>' + (g.div.length ? '<span class="pill erro">Divergente</span>' : (c.pc.cond || c.icms.cond || c.st.st === 'cest') ? '<span class="pill alerta">Conferir</span>' : '<span class="pill ok">Confere</span>') + '</td>' : '') + '</tr>';
  });
  h += '</tbody></table></div>';
  if (f.length > 400 && !S.imprimindo) h += '<p class="note">Mostrando 400 de ' + f.length + '. Use a busca ou baixe o Excel.</p>';
  h += '<p class="note">Clique no NCM para ver a classificação completa com a base legal. A comparação considera o destino de cada nota (consumidor final, empresa, outro estado) e o regime escolhido acima.</p>';
  return h;
}

/* ---------- comparativo: como as notas foram emitidas × após corrigir as pendências ---------- */
var CAMPOS_AJ = ['icmsD', 'icmsC', 'pisD', 'pisC', 'cofD', 'cofC'];
function comparativo(ds, T, comAlertas) {
  var atual = {}, corr = {}, porCod = {}, semEfeito = 0, foraConta = 0;
  CAMPOS_AJ.forEach(function (k) { atual[k] = T[k]; corr[k] = T[k]; });
  S.res.pend.forEach(function (p) {
    if (ds.indexOf(p.dt) < 0) return;
    var aj = p.aj;
    if (!aj) { if (p.sev !== 'info') semEfeito++; return; }
    var A = aj.a || {}, C = aj.c || {};
    var aplica = (p.sev === 'erro' || comAlertas) && !(acompDe(p.ch) && acompDe(p.ch).s === 'aceita');
    CAMPOS_AJ.forEach(function (k) { atual[k] += A[k] || 0; corr[k] += aplica ? (C[k] || 0) : (A[k] || 0); });
    if (!aplica) { foraConta++; return; }
    var g = porCod[p.cod] || (porCod[p.cod] = { cod: p.cod, n: 0, icms: 0, pis: 0, cof: 0, sev: p.sev });
    g.n++;
    g.icms += ((C.icmsD || 0) - (A.icmsD || 0)) - ((C.icmsC || 0) - (A.icmsC || 0));
    g.pis += ((C.pisD || 0) - (A.pisD || 0)) - ((C.pisC || 0) - (A.pisC || 0));
    g.cof += ((C.cofD || 0) - (A.cofD || 0)) - ((C.cofC || 0) - (A.cofC || 0));
  });
  var lin = function (o) { return { icmsD: o.icmsD, icmsC: o.icmsC, icms: o.icmsD - o.icmsC, pisD: o.pisD, pisC: o.pisC, pis: o.pisD - o.pisC, cofD: o.cofD, cofC: o.cofC, cof: o.cofD - o.cofC }; };
  var grupos = Object.values(porCod).sort(function (a, b) { return Math.abs(b.icms + b.pis + b.cof) - Math.abs(a.icms + a.pis + a.cof); });
  return { atual: lin(atual), corr: lin(corr), grupos: grupos, semEfeito: semEfeito, foraConta: foraConta };
}
var LINHAS_CMP = [['icmsD', 'ICMS · débito'], ['icmsC', 'ICMS · crédito'], ['icms', 'ICMS · saldo', 1], ['pisD', 'PIS · débito'], ['pisC', 'PIS · crédito'], ['pis', 'PIS · saldo', 1], ['cofD', 'COFINS · débito'], ['cofC', 'COFINS · crédito'], ['cof', 'COFINS · saldo', 1]];
function difCell(v) { return '<td class="r num' + (Math.abs(v) < 0.005 ? ' small' : '') + '">' + (Math.abs(v) < 0.005 ? '–' : (v > 0 ? '+' : '') + m0(v)) + '</td>'; }
function tabComparativo(ds, T) {
  var c = comparativo(ds, T, S.cmpAlertas);
  var h = '<p class="note">Compara duas apurações do mesmo período: <b>como as notas foram emitidas</b> e <b>como fica depois de corrigir as pendências</b> (CC-e, nota complementar ou substituta do fornecedor ou do cliente). Pendências marcadas como "Conferida, sem ação" ficam como estão.</p>';
  h += '<div class="toolbar"><div class="chips" role="group" aria-label="O que corrigir">' + [[false, 'Corrigir só os erros'], [true, 'Corrigir erros e alertas']].map(function (o) { return '<button type="button" class="chip" data-cmpal="' + o[0] + '" aria-pressed="' + (!!S.cmpAlertas === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div><span class="small">Saldo entre parênteses é credor. Diferença positiva aumenta o imposto a recolher.</span></div>';
  h += '<div class="tscroll"><table class="cmp"><thead><tr><th></th><th class="r">Como as notas foram emitidas</th><th class="r">Após as correções</th><th class="r">Diferença</th></tr></thead><tbody>';
  LINHAS_CMP.forEach(function (l) {
    var a = c.atual[l[0]], b = c.corr[l[0]];
    if (l[2]) h += '<tr class="tot"><td><b>' + l[1] + '</b></td>' + saldoCell(a) + saldoCell(b) + difCell(b - a) + '</tr>';
    else h += '<tr><td>' + l[1] + '</td><td class="r num">' + m0(a) + '</td><td class="r num">' + m0(b) + '</td>' + difCell(b - a) + '</tr>';
  });
  var ta = c.atual.icms + c.atual.pis + c.atual.cof, tb = c.corr.icms + c.corr.pis + c.corr.cof;
  h += '</tbody><tfoot><tr><td>ICMS + PIS + COFINS</td>' + saldoCell(ta) + saldoCell(tb) + difCell(tb - ta) + '</tr></tfoot></table></div>';
  if (c.grupos.length) {
    h += '<div><h3>De onde vem a diferença</h3></div><div class="tscroll"><table><thead><tr><th>Ocorrência</th><th class="r">Pendências</th><th class="r">ICMS</th><th class="r">PIS</th><th class="r">COFINS</th></tr></thead><tbody>';
    c.grupos.forEach(function (g) { h += '<tr><td><span class="pill ' + g.sev + '">' + { erro: 'Erro', alerta: 'Alerta', info: 'Aviso' }[g.sev] + '</span> ' + esc(COD_TIT[g.cod] || g.cod) + '</td><td class="r num">' + g.n + '</td>' + difCell(g.icms) + difCell(g.pis) + difCell(g.cof) + '</tr>'; });
    h += '</tbody></table></div>';
  } else h += '<div class="empty"><span class="pill ok">Sem diferença</span><p class="note">Nenhuma pendência do período altera os valores apurados.</p></div>';
  var obs = [];
  if (c.foraConta) obs.push(c.foraConta + (c.foraConta === 1 ? ' pendência ficou' : ' pendências ficaram') + ' como está' + (S.cmpAlertas ? ' (conferidas, sem ação)' : ' (alertas, avisos ou conferidas, sem ação)'));
  if (c.semEfeito) obs.push(c.semEfeito + (c.semEfeito === 1 ? ' pendência não muda' : ' pendências não mudam') + ' o valor dos impostos: CFOP, produto sem classificação, ST retida pelo fornecedor, nota duplicada e semelhantes. Elas aparecem na aba Pendências');
  if (obs.length) h += '<p class="note">' + obs.join('. ') + '.</p>';
  h += '<p class="note">Crédito de ICMS de nota de fornecedor só pode ser aproveitado depois que o fornecedor corrigir a nota (complementar ou substituta). Na aba Apuração, o ICMS está como as notas foram emitidas e o PIS/COFINS já segue a regra (1,65% e 7,6% sobre a receita sem ICMS, monofásicos sem débito). Aqui, a primeira coluna mostra o PIS/COFINS que resultaria de seguir o destaque das notas com erro.</p>';
  return h;
}

var COD_TIT = { ST_SAIDA: 'Saída ainda como ST', ALIQ_INT: 'Alíquota interna', SEM_TRIB: 'Venda sem ICMS', ALIQ_INTER: 'Alíquota interestadual', ST_INTER: 'ST interestadual', MONO_TRIB: 'PIS/COFINS indevido na revenda', MONO_CST: 'CST monofásico', TEMA69: 'ICMS na base do PIS/COFINS', ST_FORN: 'Fornecedor reteve ST', ST60_FORN: 'Fornecedor emitiu como ST', ALIQ_FORN: 'Alíquota do fornecedor', ALIQ_INTER_FORN: 'Alíquota interestadual do fornecedor', ST_INTER_FORN: 'ST de outra UF', MONO_FORN: 'Monofásico na compra', INSUMO_MONO: 'Insumo monofásico', MONO_COND: 'Monofásico condicionado', CFOP_ST: 'CFOP de ST com ICMS normal', CFOP_FORN: 'CFOP de ST na nota do fornecedor', ICMS_ZERO_FORN: 'Tributado sem ICMS destacado', ST_INTER60_FORN: 'Interestadual sem ICMS após a ST', DUP_NF: 'Possível nota duplicada', PROD_PEND: 'Produto sem classificação', CTE_CALC: 'Cálculo do ICMS do frete', CTE_ALIQ: 'Alíquota do frete', CTE_SP: 'Alíquota do frete em SP', CTE_ST: 'Frete com ST', CTE_MONO: 'Frete de monofásico', CTE_SEM_NF: 'Frete sem a nota da compra', ISS_ALIQ: 'Alíquota do ISS', ISS_CALC: 'Cálculo do ISS', NFSE_PIS: 'PIS/COFINS do serviço', NFSE_CST: 'CST do serviço', SERV_PEND: 'Serviço sem classificação', ISS_RET: 'ISS retido a recolher', MONO_SN: 'Segregação no PGDAS-D', CAD_ICMS: 'ICMS do cadastro do produto', ICMS_CALC: 'Cálculo do ICMS', DIFAL: 'DIFAL' };
var COD_IMP = { ST_SAIDA: 'icms', ALIQ_INT: 'icms', SEM_TRIB: 'icms', ALIQ_INTER: 'icms', ST_INTER: 'icms', ST_FORN: 'icms', ST60_FORN: 'icms', ALIQ_FORN: 'icms', ALIQ_INTER_FORN: 'icms', ST_INTER_FORN: 'icms', ICMS_CALC: 'icms', DIFAL: 'icms', MONO_TRIB: 'pc', MONO_CST: 'pc', TEMA69: 'pc', MONO_FORN: 'pc', INSUMO_MONO: 'pc', MONO_COND: 'pc', CFOP_ST: 'icms', CFOP_FORN: 'icms', ICMS_ZERO_FORN: 'icms', ST_INTER60_FORN: 'icms', DUP_NF: 'ambos', PROD_PEND: 'ambos', CTE_CALC: 'icms', CTE_ALIQ: 'icms', CTE_SP: 'icms', CTE_ST: 'icms', CTE_MONO: 'pc', CTE_SEM_NF: 'pc', ISS_ALIQ: 'iss', ISS_CALC: 'iss', NFSE_PIS: 'pc', NFSE_CST: 'pc', SERV_PEND: 'pc', ISS_RET: 'iss', CAD_ICMS: 'icms', MONO_SN: 'pc' };
var IMP_LBL = { icms: 'ICMS', pc: 'PIS/COFINS', iss: 'ISS', ambos: 'ICMS e PIS/COFINS' };
function impDe(p) { return COD_IMP[p.cod] || 'ambos'; }
function impOk(p) { var i = impDe(p); return S.fImp === 'todos' || i === S.fImp || i === 'ambos'; }

var SIT = { aberta: 'Em aberto', contatado: 'Emitente avisado', corrigida: 'Corrigida', aceita: 'Conferida, sem ação' };
var SIT_PILL = { aberta: 'alerta', contatado: 'info', corrigida: 'ok', aceita: 'ok' };
function acompDe(ch) { return S.emp && S.emp.acomp ? S.emp.acomp[ch] : null; }
function resolvida(ch) { var a = acompDe(ch); return !!a && (a.s === 'corrigida' || a.s === 'aceita'); }
function celAcomp(ch, temPend) {
  var a = acompDe(ch), h = '';
  if (a) h += '<span class="pill ' + SIT_PILL[a.s] + '">' + SIT[a.s] + '</span>' + (a.t ? '<div class="small" style="max-width:32ch">' + esc(a.t) + '</div>' : '') + '<div class="small">' + new Date(a.em).toLocaleDateString('pt-BR') + '</div>';
  else if (temPend) h += '<span class="small">Em aberto</span>';
  if (!S.readonly && !S.exemplo) h += '<div><button type="button" class="link" data-ac="' + esc(ch) + '">' + (a ? 'Alterar' : 'Anotar') + '</button></div>';
  return h;
}
function editorAcomp() {
  var ch = S.editAc; if (!ch) return '';
  var n = S.res.notas.filter(function (x) { return x.ch === ch; })[0] || { n: '?', parte: { n: '' } };
  var a = acompDe(ch) || { s: 'aberta', t: '' };
  return '<form id="fAcomp" class="card" style="padding:14px;display:flex;flex-direction:column;gap:10px;border-color:var(--s1)">' +
    '<h3>Acompanhamento da nota nº ' + esc(n.n) + ' · ' + esc(n.parte.n || '') + '</h3>' +
    '<div class="row"><div class="field" style="max-width:260px"><label for="acStatus">Situação</label><select id="acStatus">' +
    Object.keys(SIT).map(function (k) { return '<option value="' + k + '"' + (a.s === k ? ' selected' : '') + '>' + SIT[k] + '</option>'; }).join('') + '</select></div>' +
    '<div class="field"><label for="acTexto">Anotação (o cliente também vê)</label><input id="acTexto" maxlength="300" value="' + esc(a.t || '') + '" placeholder="Ex.: CC-e solicitada ao fornecedor em 28/10"></div></div>' +
    '<p class="note">"Corrigida" e "Conferida, sem ação" tiram as pendências da nota das contagens de erros e alertas.</p>' +
    '<div class="row"><button class="btn primary" type="submit">Salvar</button><button class="btn" type="button" data-act="fecharAc">Cancelar</button>' + (acompDe(ch) ? '<button class="btn danger" type="button" data-act="limparAc">Remover anotação</button>' : '') + '</div></form>';
}
function tabPendencias(pend) {
  var cSit = { abertas: pend.filter(function (p) { return !resolvida(p.ch); }).length, resolvidas: pend.filter(function (p) { return resolvida(p.ch); }).length };
  pend = pend.filter(function (p) { return S.fSit === 'todas' || (S.fSit === 'resolvidas' ? resolvida(p.ch) : !resolvida(p.ch)); });
  var f = pend.filter(function (p) { return impOk(p) && (S.fQuem === 'todos' || p.quem === S.fQuem) && (S.fSev === 'todos' || p.sev === S.fSev) && bate(S.q, [p.n, p.ch, p.parte, p.ncm, p.x, p.msg, COD_TIT[p.cod]]); });
  var ord = { erro: 0, alerta: 1, info: 2 }; f.sort(function (a, b) { return ord[a.sev] - ord[b.sev] || (a.dt < b.dt ? 1 : -1); });
  var cI = function (k) { return pend.filter(function (p) { return p.sev !== 'info' && (k === 'todos' || impDe(p) === k); }).length; };
  var h = editorAcomp() + '<div class="toolbar"><div class="chips" role="group" aria-label="Situação">' + [['abertas', 'Em aberto (' + cSit.abertas + ')'], ['resolvidas', 'Resolvidas (' + cSit.resolvidas + ')'], ['todas', 'Todas']].map(function (c) { return '<button type="button" class="chip" data-fsit="' + c[0] + '" aria-pressed="' + (S.fSit === c[0]) + '">' + c[1] + '</button>'; }).join('') + '</div></div>';
  h += '<div class="toolbar"><div class="chips" role="group" aria-label="Imposto">' + [['todos', 'Todos os impostos'], ['icms', 'ICMS'], ['pc', 'PIS/COFINS'], ['iss', 'ISS']].map(function (c) { return '<button type="button" class="chip" data-fimp="' + c[0] + '" aria-pressed="' + (S.fImp === c[0]) + '">' + c[1] + ' <span class="num">(' + cI(c[0]) + ')</span></button>'; }).join('') + '</div></div>';
  h += '<div class="toolbar"><div class="chips" role="group" aria-label="Origem">' + [['todos', 'Todas'], ['cliente', 'Emitidas pelo cliente'], ['fornecedor', 'De fornecedores']].map(function (c) { return '<button type="button" class="chip" data-fquem="' + c[0] + '" aria-pressed="' + (S.fQuem === c[0]) + '">' + c[1] + '</button>'; }).join('') + '</div>';
  h += '<div class="chips" role="group" aria-label="Gravidade">' + [['todos', 'Todas'], ['erro', 'Erros'], ['alerta', 'Alertas'], ['info', 'Avisos']].map(function (c) { return '<button type="button" class="chip" data-fsev="' + c[0] + '" aria-pressed="' + (S.fSev === c[0]) + '">' + c[1] + '</button>'; }).join('') + '</div></div>';
  if (!f.length) return h + '<div class="empty"><span class="pill ok">Nenhuma pendência</span><p class="note">Nada encontrado para este período e filtro.</p></div>';
  h += '<div class="tscroll"><table><thead><tr><th>Gravidade</th><th>Imposto</th><th>Nota</th><th>Emitente / destinatário</th><th>Item</th><th>O que corrigir</th><th class="r">Impacto est.</th><th>Acompanhamento</th></tr></thead><tbody>';
  f.slice(0, S.imprimindo ? 1e9 : 500).forEach(function (p) {
    h += '<tr><td><span class="pill ' + p.sev + '">' + { erro: 'Erro', alerta: 'Alerta', info: 'Aviso' }[p.sev] + '</span><div class="small">' + (p.quem === 'cliente' ? 'Cliente' : 'Fornecedor') + '</div></td><td><span class="tag">' + IMP_LBL[impDe(p)] + '</span></td><td class="num" style="white-space:nowrap"><button type="button" class="link" data-ver="' + esc(p.ch) + '" title="Ver a nota">Nº ' + esc(p.n) + '</button><div class="small">' + brFull(p.dt) + '</div></td><td>' + esc(p.parte || 'Consumidor final') + '</td><td>' + (p.item ? esc(p.x) + '<div class="small mono">NCM ' + esc(p.ncm) + ' · item ' + p.item + '</div>' : '<span class="small">Nota inteira</span>') + '</td><td class="msg"><b>' + esc(COD_TIT[p.cod] || p.cod) + '.</b> ' + esc(p.msg) + (p.cod === 'PROD_PEND' && !S.readonly ? ' <button type="button" class="link" data-act="irProdutos">Classificar</button>' : '') + '</td><td class="r num">' + (p.imp ? m0(p.imp) : '–') + '</td><td>' + celAcomp(p.ch, true) + '</td></tr>';
  });
  h += '</tbody></table></div>';
  if (f.length > 500 && !S.imprimindo) h += '<p class="note">Mostrando 500 de ' + f.length + '. Use a busca ou os filtros.</p>';
  h += '<div><button class="btn" type="button" data-act="csv">Baixar pendências (CSV)</button></div>';
  return h;
}
function tabNotas(notas) {
  var pendN = function (n) { return n.pior === 'erro' || n.pior === 'alerta'; };
  var cnt = { todas: notas.length, pend: notas.filter(function (n) { return pendN(n) && !resolvida(n.ch); }).length, ok: notas.filter(function (n) { return !pendN(n) || resolvida(n.ch); }).length, anot: notas.filter(function (n) { return acompDe(n.ch); }).length };
  notas = notas.filter(function (n) { return S.fNota === 'todas' || (S.fNota === 'pend' ? pendN(n) && !resolvida(n.ch) : S.fNota === 'ok' ? (!pendN(n) || resolvida(n.ch)) : !!acompDe(n.ch)); });
  var h = editorAcomp() + '<div class="toolbar"><div class="chips" role="group" aria-label="Filtrar notas">' + [['todas', 'Todas'], ['pend', 'Com pendência em aberto'], ['ok', 'Corretas ou resolvidas'], ['anot', 'Com anotação']].map(function (c) { return '<button type="button" class="chip" data-fnota="' + c[0] + '" aria-pressed="' + (S.fNota === c[0]) + '">' + c[1] + ' <span class="num">(' + cnt[c[0]] + ')</span></button>'; }).join('') + '</div></div>';
  if (!notas.length) return h + '<div class="empty"><p class="note">Nenhuma nota neste filtro' + (S.q ? ' e busca' : '') + '.</p></div>';
  h += '<div class="tscroll"><table><thead><tr><th>Tipo</th><th>Data</th><th>Nota</th><th>Emitente / destinatário</th><th class="r">Valor</th><th class="r">ICMS</th><th class="r">PIS/COFINS</th><th>Auditoria</th><th>Acompanhamento</th></tr></thead><tbody>';
  notas.slice(0, S.imprimindo ? 1e9 : 400).forEach(function (n) {
    var t = n.T, icms = n.dir === 'S' ? t.icmsD : t.icmsC, pc = n.dir === 'S' ? t.pisD + t.cofD : t.pisC + t.cofC;
    h += '<tr><td><span class="pill ' + (n.dir === 'X' ? 'E' : n.dir) + '">' + (n.dir === 'S' ? 'Saída' : n.dir === 'X' ? 'Informativo' : 'Entrada') + '</span><div class="small">' + (n.tipo === 'cte' ? 'CT-e' + (n.extra && !n.extra.tomadora ? ' · ' + esc(n.extra.papel) : '') : n.tipo === 'nfse' ? 'NFS-e · cód. ' + esc(n.extra.cod) : (n.mod === '65' ? 'NFC-e' : 'NF-e') + (n.interna ? ' · interna' : ' · interestadual')) + '</div></td><td class="num">' + brFull(n.dt) + '</td><td class="num"><button type="button" class="link" data-ver="' + esc(n.ch) + '" title="Ver a nota">' + esc(n.n) + '</button><div class="small mono" title="' + esc(n.ch) + '">' + esc(n.ch.slice(0, 4) + '…' + n.ch.slice(-8)) + '</div></td><td>' + esc(n.parte.n || 'Consumidor final') + '<div class="small">' + esc(fmtCnpj(n.parte.c)) + (n.parte.uf ? ' · ' + esc(n.parte.uf) : '') + '</div></td><td class="r num">' + m0(n.vNF) + '</td><td class="r num">' + m0(icms) + '<div class="small">' + (n.dir === 'S' ? 'débito' : n.dir === 'X' ? 'sem crédito' : 'crédito') + '</div></td><td class="r num">' + m0(pc) + '</td><td>' + (n.pior && n.pior !== 'info' ? (resolvida(n.ch) ? '<span class="pill ok">' + n.nIss + (n.nIss === 1 ? ' ponto resolvido' : ' pontos resolvidos') + '</span>' : '<span class="pill ' + n.pior + '">' + n.nIss + ' ' + (n.nIss === 1 ? 'ponto' : 'pontos') + '</span>') : '<span class="pill ok">Correta</span>') + (n.info ? '<div class="small" style="max-width:34ch;margin-top:4px">' + esc(n.info.charAt(0).toUpperCase() + n.info.slice(1)) + '</div>' : '') + '</td><td>' + celAcomp(n.ch, n.pior === 'erro' || n.pior === 'alerta') + '</td></tr>';
  });
  h += '</tbody></table></div>';
  if (notas.length > 400 && !S.imprimindo) h += '<p class="note">Mostrando 400 de ' + notas.length + '. Use a busca.</p>';
  return h;
}
var CLASSES = [['revenda', 'Revenda'], ['insumo', 'Insumo de serviço'], ['uso', 'Uso e consumo'], ['ativo', 'Ativo']];
var ORIGEM = { manual: 'Definido pelo escritório', ncm: 'Regra do NCM', sugerido: 'Sugerido como revenda', nenhum: '' };
function fornecedores(todos) {
  var m = {}; todos.forEach(function (p) { var x = m[p.fc] || (m[p.fc] = { c: p.fc, n: p.fn || fmtCnpj(p.fc), q: 0 }); x.q++; });
  return Object.values(m).sort(function (a, b) { return a.n.localeCompare(b.n, 'pt-BR'); });
}
function nomeForn(todos, c) { var p = todos.filter(function (x) { return x.fc === c; })[0]; return p ? p.fn : fmtCnpj(c); }
function soma(l) { return l.reduce(function (a, p) { return a + p.v; }, 0); }
function nomeBase(x) {
  var w = String(x || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z ]/g, ' ').split(/\s+/).filter(function (t) { return t.length >= 3 && ['COM', 'PARA', 'DOS', 'DAS'].indexOf(t) < 0; });
  return w[0] || '(sem nome)';
}
async function classificarGrupo(tipo, chave, classe) {
  var e = S.emp, todos = Object.values(S.res.produtos);
  var alvo = todos.filter(function (p) { return (!S.fProd || S.fProd === 'todos' || p.classe === S.fProd) && (!S.fNcm || p.ncm === S.fNcm) && (!S.fForn || p.fc === S.fForn) && bate(S.q, [p.x, p.cp, p.ncm, p.fn, p.fc]) && (tipo === 'ncm' ? p.ncm === chave : tipo === 'forn' ? p.fc === chave : nomeBase(p.x) === chave); });
  if (!alvo.length) return;
  if (tipo === 'ncm') { var antes = S.porNcm; S.porNcm = true; await classificar(alvo[0].k, chave, classe); S.porNcm = antes; toast('NCM ' + chave + ' classificado como ' + nomeClasse(classe).toLowerCase() + '.'); return; }
  var agora = new Date().toISOString(), copia = JSON.parse(JSON.stringify(e.prodCad)), nHist = e.hist.length;
  alvo.forEach(function (p) { var a = e.prodCad[p.k]; e.prodCad[p.k] = { c: classe, em: agora, x: p.x || '', ncm: p.ncm || '' }; e.hist.push({ em: agora, alvo: 'produto', ref: p.k, x: (p.x || '') + ' · ' + (p.fn || ''), de: a ? a.c : null, para: classe }); });
  recalcular(); renderMain();
  var msgG = (alvo.length === 1 ? '1 produto classificado' : alvo.length + ' produtos classificados') + ' como ' + nomeClasse(classe).toLowerCase() + '.';
  if (S.exemplo) { toast(msgG); return; }
  try {
    for (var i = 0; i < alvo.length; i += 8) await Promise.all(alvo.slice(i, i + 8).map(function (p) { return B.classificarProduto(e.id, p.k, p.ncm, (p.x || '') + ' · ' + (p.fn || ''), classe); }));
    toast(msgG);
  } catch (err) { e.prodCad = copia; e.hist.length = nHist; recalcular(); renderMain(); toast('Não foi possível salvar a classificação: ' + erroTexto(err)); }
}
function tabProdutos() {
  var todos = Object.values(S.res.produtos);
  var cnt = function (c) { return todos.filter(function (p) { return c === 'todos' || p.classe === c; }).length; };
  var f = todos.filter(function (p) { return (S.fProd === 'todos' || p.classe === S.fProd) && (!S.fNcm || p.ncm === S.fNcm) && (!S.fNome || nomeBase(p.x) === S.fNome) && (!S.fForn || p.fc === S.fForn) && bate(S.q, [p.x, p.cp, p.ncm, p.fn, p.fc]); });
  f.sort(function (a, b) { return (a.classe === 'pendente' ? 0 : 1) - (b.classe === 'pendente' ? 0 : 1) || b.v - a.v; });
  var grp = S.gProd || 'nenhum';
  var h = '<p class="note">Produtos comprados de fornecedores. Revenda dá crédito de ICMS e, se o produto não for monofásico, de PIS/COFINS. As etiquetas mostram o que é monofásico (PIS/COFINS) e o que saiu da ST em 01/10 (ICMS). Insumo de serviço (peça aplicada na prestação do serviço) dá crédito de PIS/COFINS, mas não de ICMS. Uso e consumo e ativo saem do crédito de ICMS e de PIS/COFINS. ' + ((S.emp.meta.segmento || 'autopecas') === 'autopecas' ? 'NCM de pneus e autopeças já vem sugerido como revenda.' : 'No varejo, toda compra vem sugerida como revenda; marque o que for uso e consumo ou ativo.') + ' A classificação fica no histórico e vale para as próximas importações.</p>';
  h += '<div class="toolbar"><div class="chips" role="group" aria-label="Classificação">' + [['todos', 'Todos'], ['pendente', 'Sem classificação'], ['revenda', 'Revenda'], ['insumo', 'Insumo de serviço'], ['uso', 'Uso e consumo'], ['ativo', 'Ativo']].map(function (c) { return '<button type="button" class="chip" data-fprod="' + c[0] + '" aria-pressed="' + (S.fProd === c[0]) + '">' + c[1] + ' <span class="num">(' + cnt(c[0]) + ')</span></button>'; }).join('') + '</div>';
  if (!S.readonly) h += '<label class="check" for="porNcm"><input type="checkbox" id="porNcm"' + (S.porNcm ? ' checked' : '') + '> Aplicar a todos os produtos do mesmo NCM</label>';
  h += '</div>';
  h += '<div class="toolbar"><div class="row" style="gap:8px;align-items:center"><span class="small">Agrupar</span><div class="seg" role="group" aria-label="Agrupar produtos">' + [['nenhum', 'Sem grupos'], ['ncm', 'Por NCM'], ['nome', 'Por nome'], ['forn', 'Por fornecedor']].map(function (g) { return '<button type="button" data-gprod="' + g[0] + '" aria-pressed="' + (grp === g[0]) + '">' + g[1] + '</button>'; }).join('') + '</div>' +
    '<label class="small" for="fForn" style="margin-left:6px">Fornecedor</label><select id="fForn" class="sel-forn"><option value="">Todos</option>' + fornecedores(todos).map(function (x) { return '<option value="' + esc(x.c) + '"' + (S.fForn === x.c ? ' selected' : '') + '>' + esc(x.n) + ' (' + x.q + ')</option>'; }).join('') + '</select></div>' +
    (S.fNcm || S.fNome || S.fForn ? '<button type="button" class="chip" aria-pressed="true" data-limpafiltro="1">' + [S.fNcm ? 'NCM ' + esc(S.fNcm) : '', S.fForn ? esc(nomeForn(todos, S.fForn)) : ''].filter(Boolean).join(' e ') + ' ✕</button>' : '<span class="small">Clique no NCM ou no fornecedor de um produto para filtrar.</span>') + '</div>';
  if (!f.length) h += '<div class="empty"><p class="note">Nenhum produto neste filtro.</p></div>';
  else {
    h += '<div class="tscroll"><table><thead><tr><th>Produto</th><th>NCM</th><th class="r">Compras</th><th>Classificação</th></tr></thead><tbody>';
    var linhas = [];
    if (grp === 'nenhum') f.forEach(function (p) { linhas.push(p); });
    else {
      var gs = {}; f.forEach(function (p) { var k = grp === 'ncm' ? p.ncm : grp === 'forn' ? p.fc : nomeBase(p.x); (gs[k] = gs[k] || []).push(p); });
      Object.keys(gs).sort(function (a, b) { return gs[b].length - gs[a].length || soma(gs[b]) - soma(gs[a]); }).forEach(function (k) { linhas.push({ grupo: k, itens: gs[k] }); gs[k].forEach(function (p) { linhas.push(p); }); });
    }
    var mostrados = 0;
    linhas.forEach(function (p) {
      if (p.grupo !== undefined) {
        var its = p.itens, pend = its.filter(function (x) { return x.classe === 'pendente'; }).length;
        h += '<tr class="grp-prod"><td colspan="4"><div class="grp-cab"><div><b>' + (grp === 'ncm' ? 'NCM <span class="mono">' + esc(p.grupo) + '</span>' : grp === 'forn' ? esc(its[0].fn) + ' <span class="small" style="font-weight:400">' + esc(fmtCnpj(p.grupo)) + '</span>' : esc(p.grupo)) + '</b> <span class="small">' + its.length + (its.length === 1 ? ' produto' : ' produtos') + ' · ' + m0(soma(its)) + (pend ? ' · ' + pend + ' sem classificação' : '') + '</span></div>' +
          (S.readonly ? '' : '<div class="row" style="gap:6px;align-items:center"><span class="small">' + (grp === 'ncm' ? 'Classificar o NCM inteiro (vale também nas próximas compras):' : its.length === 1 ? 'Classificar como:' : 'Classificar os ' + its.length + ' como:') + '</span><div class="seg" role="group" aria-label="Classificar o grupo">' + CLASSES.map(function (c) { return '<button type="button" data-gclasse="' + c[0] + '" data-gtipo="' + grp + '" data-gchave="' + esc(p.grupo) + '">' + c[1] + '</button>'; }).join('') + '</div></div>') + '</div></td></tr>';
        return;
      }
      if (mostrados++ >= (S.imprimindo ? 1e9 : 400)) return;
      var ctrl = S.readonly ? (p.classe === 'pendente' ? '' : '<span class="pill ok">' + esc((CLASSES.filter(function (c) { return c[0] === p.classe; })[0] || [])[1] || p.classe) + '</span>')
        : '<div class="seg" role="group" aria-label="Classificar">' + CLASSES.map(function (c) { return '<button type="button" data-classe="' + c[0] + '" data-pk="' + esc(p.k) + '" data-ncm="' + esc(p.ncm) + '" aria-pressed="' + (p.classe === c[0] && p.origem !== 'sugerido') + '">' + c[1] + '</button>'; }).join('') + '</div>';
      var orig = p.classe === 'pendente' ? '<span class="pill alerta">Sem classificação</span>' : '<span class="small">' + esc(ORIGEM[p.origem]) + '</span>';
      var desf = !S.readonly && (p.origem === 'manual' || p.origem === 'ncm') ? ' <button type="button" class="link" data-desfazer="' + esc(p.k) + '" data-origem="' + p.origem + '" data-ncm="' + esc(p.ncm) + '">Desfazer</button>' : '';
      h += '<tr><td>' + esc(p.x) + '<div class="small">Cód. ' + esc(p.cp || '–') + ' · <button type="button" class="link" data-fforn="' + esc(p.fc) + '" title="Ver só este fornecedor">' + esc(p.fn) + '</button></div></td><td class="mono" style="white-space:nowrap"><button type="button" class="link mono" data-fncm="' + esc(p.ncm) + '" title="Ver só este NCM">' + esc(p.ncm) + '</button>' + ((p.mono || p.monoCond || p.st) ? '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:3px">' + (p.mono ? '<span class="tag">Monofásico</span>' : p.monoCond ? '<span class="tag" title="Depende da destinação (Anexos I e II)">Monofásico?</span>' : '') + (p.st ? '<span class="tag">Saiu da ST</span>' : '') + '</div>' : '') + '</td><td class="r num">' + m0(p.v) + '<div class="small">' + p.n + ' ' + (p.n === 1 ? 'compra' : 'compras') + ' · última ' + brFull(p.ult) + '</div></td><td>' + ctrl + '<div style="margin-top:5px">' + orig + desf + '</div></td></tr>';
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
    fr.slice(0, S.imprimindo ? 1e9 : 400).forEach(function (f) {
      h += '<tr><td class="num">' + brFull(f.dt) + '</td><td class="num"><button type="button" class="link" data-ver="' + esc(f.ch) + '">' + esc(f.n) + '</button><div class="small">' + esc(f.rota) + '</div></td><td>' + esc(f.transp) + '</td><td>' + (f.tomadora ? '<span class="pill ok">Tomadora</span><div class="small">' + esc(f.papel) + '</div>' : '<span class="pill E">Não tomadora</span><div class="small">' + esc(f.papel) + ' · paga: ' + esc(f.toma) + '</div>') + '</td><td class="r num">' + m0(f.v) + '</td><td class="r num">' + m0(f.credICMS) + '</td><td class="r num">' + m0(f.credPC) + '</td></tr>';
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
    await B.salvarNotas(cnpj, daEmp, function (feitas, total) { S.imp = { gravando: true, gravadas: feitas, total: total }; renderOffice(); }, e.pub);
    await B.salvarCancelamentos(cnpj, canc);
    var xs = [];
    for (var ix = 0; ix < daEmp.length; ix++) { var tx = acc.xml[daEmp[ix].ch]; if (tx) xs.push({ chave: daEmp[ix].ch, gz: await compactar(tx) }); }
    S.imp = { gravando: true, gravadas: 0, total: xs.length, xml: true }; renderOffice();
    await B.salvarXmls(cnpj, xs, function (feitas, total) { S.imp = { gravando: true, gravadas: feitas, total: total, xml: true }; renderOffice(); });
    if (!e.meta.nome) { var nm = nomeDe(daEmp, cnpj); if (nm) { await B.salvarEmpresa(cnpj, { razao_social: nm }); e.meta.nome = nm; } }
  }
  var atual = {}; e.notas.forEach(function (n) { atual[n.ch] = n; });
  e.xmls = e.xmls || {};
  daEmp.forEach(function (n) { atual[n.ch] = n; if (!e.pub[n.ch]) e.pub[n.ch] = false; if (acc.xml[n.ch]) e.xmls[n.ch] = acc.xml[n.ch]; });
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

/* ---------- passo a passo ---------- */
function passosTour() {
  var simples = regimeEmp() === 'simples';
  return [
    { t: 'Bem-vindo ao portal da RG Fiscal', x: 'Aqui você acompanha as notas fiscais da sua empresa, os impostos do período e o que precisa ser corrigido. Em poucos passos mostramos onde fica cada informação.' },
    { el: '#veredito', t: 'O resumo do período', x: 'Esta frase resume tudo: como fecham o ICMS, o PIS e a COFINS e quantos erros encontramos nas notas. O botão leva direto ao que precisa ser corrigido.' },
    { el: '.periods', t: 'Escolha o período', x: 'Toque numa semana ou em "Todas as semanas" para mudar o período. Em "Meses", acima dos números, a visão passa a ser mensal, que é a da apuração oficial.' },
    { el: '.mov', t: 'Vendas e compras', x: 'Quanto a empresa vendeu, comprou e contratou de serviços e fretes no período escolhido.' },
    simples ? { el: '.kpi-simples', t: 'Receita para o Simples', x: 'A receita do período já separada como o PGDAS-D pede: com ICMS por substituição tributária, monofásica e tributada normalmente.' }
      : { el: '.kpis', t: 'Impostos como as notas foram emitidas', x: 'ICMS, PIS e COFINS calculados com os valores que estão nas notas, inclusive os errados. Verde é saldo credor (crédito sobrando); escuro é imposto a recolher.' },
    simples ? null : { el: '.kpis-corr', t: 'Como deve ficar depois das correções', x: 'Os mesmos impostos depois de corrigir as notas com erro. O último card mostra o impacto: quanto os tributos aumentam ou diminuem com as correções.' },
    { el: '.tabs [data-tab="pendencias"]', t: 'O que corrigir', x: 'A lista de erros e alertas encontrados nas notas, com a explicação de cada um e o valor envolvido. Os itens que o escritório já tratou aparecem como resolvidos.' },
    { el: '.tabs [data-tab="notas"]', t: 'Todas as notas', x: 'Cada nota do período, com o resultado da conferência. Clique no número da nota para ver o documento completo e baixar o XML.' },
    { el: '[data-act="excel"]', t: 'Leve os dados com você', x: 'Baixe tudo em Excel ou imprima a tela. Os arquivos respeitam o período escolhido.' },
    { el: '[data-act="tour"]', t: 'Pronto!', x: 'Sempre que quiser rever este passo a passo, clique neste ícone. Se tiver dúvida, fale com a RG Fiscal.' }
  ].filter(Boolean);
}
function iniciarTour() { S.tour = { i: 0 }; desenharTour(); }
function fecharTour() {
  var nao = $('tourNao'); if (nao && nao.checked) ls('pf.tourOff', '1');
  S.tour = null; var el = $('tour'); if (el) el.remove();
  window.removeEventListener('resize', desenharTour); window.removeEventListener('scroll', posicionarTour, true);
}
function passoTour(d) { if (!S.tour) return; var n = passosTour().length; S.tour.i = Math.max(0, Math.min(n - 1, S.tour.i + d)); desenharTour(); }
function desenharTour() {
  if (!S.tour) return;
  var ps = passosTour(), i = S.tour.i, p = ps[i];
  var alvo = p.el ? document.querySelector(p.el) : null;
  if (p.el && !alvo) { if (i < ps.length - 1) { S.tour.i++; return desenharTour(); } }
  var el = $('tour');
  if (!el) {
    el = document.createElement('div'); el.id = 'tour'; el.className = 'tour'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'tourTit');
    document.body.appendChild(el);
    window.addEventListener('resize', desenharTour); window.addEventListener('scroll', posicionarTour, true);
  }
  el.innerHTML = '<div class="tour-foco" id="tourFoco"></div><div class="tour-card" id="tourCard"><div class="tour-passo">Passo ' + (i + 1) + ' de ' + ps.length + '</div><h3 id="tourTit">' + esc(p.t) + '</h3><p>' + esc(p.x) + '</p>' +
    '<div class="tour-pontos" aria-hidden="true">' + ps.map(function (_, k) { return '<i' + (k === i ? ' class="on"' : '') + '></i>'; }).join('') + '</div>' +
    '<div class="tour-acoes"><label class="check small"><input type="checkbox" id="tourNao"' + (ls('pf.tourOff') === '1' ? ' checked' : '') + '> Não mostrar ao entrar</label><div class="row" style="gap:6px">' +
    (i > 0 ? '<button class="btn" type="button" data-act="tourVolta">Voltar</button>' : '<button class="btn ghost" type="button" data-act="tourFim">Pular</button>') +
    (i < ps.length - 1 ? '<button class="btn primary" type="button" data-act="tourProx" id="tourProx">Próximo</button>' : '<button class="btn primary" type="button" data-act="tourFim" id="tourProx">Começar</button>') + '</div></div></div>';
  if (alvo) alvo.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
  posicionarTour();
  var bp = $('tourProx'); if (bp) bp.focus({ preventScroll: true });
}
function posicionarTour() {
  if (!S.tour) return;
  var p = passosTour()[S.tour.i], foco = $('tourFoco'), card = $('tourCard'); if (!foco || !card) return;
  var alvo = p && p.el ? document.querySelector(p.el) : null;
  var vw = window.innerWidth, vh = window.innerHeight, cw = Math.min(380, vw - 24);
  card.style.width = cw + 'px';
  if (!alvo) { foco.style.cssText = 'left:50%;top:50%;width:0;height:0'; card.style.left = (vw - cw) / 2 + 'px'; card.style.top = Math.max(12, (vh - card.offsetHeight) / 2) + 'px'; return; }
  var r = alvo.getBoundingClientRect(), m = 6;
  foco.style.cssText = 'left:' + (r.left - m) + 'px;top:' + (r.top - m) + 'px;width:' + (r.width + 2 * m) + 'px;height:' + (r.height + 2 * m) + 'px';
  var ch = card.offsetHeight, top = r.bottom + 14;
  if (top + ch > vh - 12) top = r.top - ch - 14;
  if (top < 12) top = Math.max(12, vh - ch - 12);
  var left = Math.min(Math.max(12, r.left), vw - cw - 12);
  card.style.left = left + 'px'; card.style.top = top + 'px';
}
document.addEventListener('keydown', function (ev) {
  if (!S.tour) return;
  if (ev.key === 'Escape') fecharTour();
  else if (ev.key === 'ArrowRight') passoTour(1);
  else if (ev.key === 'ArrowLeft') passoTour(-1);
});

/* ---------- Excel e impressão ---------- */
function imprimirPainel() {
  S.imprimindo = true; S.editAc = null; document.body.classList.add('imprimindo'); renderMain();
  var fim = function () { window.removeEventListener('afterprint', fim); S.imprimindo = false; document.body.classList.remove('imprimindo'); renderMain(); };
  window.addEventListener('afterprint', fim);
  setTimeout(function () { window.print(); }, 60);
}
function rotuloPeriodo() {
  if (S.periodo[0] === 'w') { var w = S.per.semanas.filter(function (x) { return 'w:' + x.ini === S.periodo; })[0]; return 'Semana ' + w.num + ' de ' + mesNome(w.mes); }
  if (S.periodo[0] === 'm') return mesNome(S.periodo.slice(2));
  return 'Todo o período';
}
async function baixarExcel() {
  if (S.gerando) return;
  S.gerando = true; renderMain();
  try {
    var e = S.emp, ds = diasSel(), T = F.somaDias(S.res.dias, ds), cnpj = e.meta.cnpj;
    var nome = e.meta.nome || nomeDe(e.notas, cnpj) || '';
    var per = rotuloPeriodo() + (ds.length ? ' (' + brFull(ds[0]) + ' a ' + brFull(ds[ds.length - 1]) + ')' : '');
    var tit = nome + ' · CNPJ ' + fmtCnpj(cnpj) + ' · ' + per;
    var pendT = S.res.pend.filter(function (p) { return ds.indexOf(p.dt) >= 0; });
    var abertas = pendT.filter(function (p) { return !resolvida(p.ch); });
    var abas = [];

    // Resumo
    var rs = [['Vendas', T.vendas], ['Serviços prestados', T.servPrest], ['Compras (total)', T.compras + T.compOut + T.compIns], ['   de insumo de serviço', T.compIns], ['   de uso e consumo / ativo', T.compOut], ['Serviços tomados', T.servTom], ['Fretes tomados (CT-e)', T.freteTom], ['', ''],
      ['ICMS débito', T.icmsD], ['ICMS crédito', T.icmsC], ['ICMS saldo (negativo = credor)', T.icmsD - T.icmsC], ['', ''],
      ['PIS débito', T.pisD], ['PIS crédito', T.pisC], ['PIS saldo', T.pisD - T.pisC], ['', ''],
      ['COFINS débito', T.cofD], ['COFINS crédito', T.cofC], ['COFINS saldo', T.cofD - T.cofC], ['', ''],
      ['ISS a recolher (prestados)', T.issDev], ['ISS retido a recolher (tomados)', T.issRetTom], ['CBS destacada (informativo)', T.cbs], ['IBS destacado (informativo)', T.ibs], ['', ''],
      ['Erros em aberto', abertas.filter(function (p) { return p.sev === 'erro'; }).length], ['Alertas em aberto', abertas.filter(function (p) { return p.sev === 'alerta'; }).length]];
    abas.push({ nome: 'Resumo', titulo: tit, filtro: false, cols: [{ t: 'Item', w: 38 }, { t: 'Valor', w: 18, f: 'din' }],
      rows: rs.map(function (r) { return [r[0], typeof r[1] === 'number' && r[0].indexOf('Erros') < 0 && r[0].indexOf('Alertas') < 0 ? r[1] : (r[1] === '' ? '' : String(r[1]))]; }) });

    // Apuração por mês, semana e dia
    var colsAp = [{ t: 'Período', w: 26 }, { t: 'Saídas', w: 8, f: 'int' }, { t: 'Entradas', w: 9, f: 'int' }, { t: 'Vendas', w: 15, f: 'din' }, { t: 'Compras', w: 15, f: 'din' }, { t: 'ICMS débito', w: 14, f: 'din' }, { t: 'ICMS crédito', w: 14, f: 'din' }, { t: 'ICMS saldo', w: 14, f: 'din' }, { t: 'PIS débito', w: 13, f: 'din' }, { t: 'PIS crédito', w: 13, f: 'din' }, { t: 'PIS saldo', w: 13, f: 'din' }, { t: 'COFINS débito', w: 14, f: 'din' }, { t: 'COFINS crédito', w: 14, f: 'din' }, { t: 'COFINS saldo', w: 14, f: 'din' }];
    var visaoX = S.apVisao === 'corr' ? 'após as correções' : 'como as notas foram emitidas';
    var linhaAp0 = function (lbl, t, dias) { return linhaAp(lbl, regimeEmp() === 'simples' ? t : visaoApur(dias, t)); };
    var linhaAp = function (lbl, t) { return [lbl, t.nS + t.nSP, t.nE + t.nST + t.nCT, t.vendas, t.compras + t.compOut + t.compIns, t.icmsD, t.icmsC, t.icmsD - t.icmsC, t.pisD, t.pisC, t.pisD - t.pisC, t.cofD, t.cofC, t.cofD - t.cofC]; };
    var tot = linhaAp0('Total', T, ds);
    var porMes = [], porSem = [], porDia = [];
    S.per.meses.forEach(function (m) { var x = m.dias.filter(function (d) { return ds.indexOf(d) >= 0; }); if (x.length) porMes.push(linhaAp0(mesNome(m.mes).charAt(0).toUpperCase() + mesNome(m.mes).slice(1), F.somaDias(S.res.dias, x), x)); });
    S.per.semanas.slice().reverse().forEach(function (w) { var x = w.dias.filter(function (d) { return ds.indexOf(d) >= 0; }); if (x.length) porSem.push(linhaAp0('Sem. ' + w.num + ' · ' + brFull(w.ini) + ' a ' + brFull(w.fim), F.somaDias(S.res.dias, x), x)); });
    ds.forEach(function (d) { porDia.push(linhaAp0(d, F.somaDias(S.res.dias, [d]), [d])); });
    var titAp = tit + (regimeEmp() === 'simples' ? '' : ' · ' + visaoX);
    abas.push({ nome: 'Apuração por mês', titulo: titAp, cols: colsAp, rows: porMes, total: tot });
    abas.push({ nome: 'Apuração por semana', titulo: titAp, cols: colsAp, rows: porSem, total: tot });
    abas.push({ nome: 'Apuração por dia', titulo: titAp, cols: [{ t: 'Data', w: 12, f: 'data' }].concat(colsAp.slice(1)), rows: porDia, total: tot });

    // Comparativo
    var cmpL = function (al) {
      var c = comparativo(ds, T, al), rows = LINHAS_CMP.map(function (l) { return [l[1], c.atual[l[0]], c.corr[l[0]], c.corr[l[0]] - c.atual[l[0]]]; });
      var ta = c.atual.icms + c.atual.pis + c.atual.cof, tb = c.corr.icms + c.corr.pis + c.corr.cof;
      rows.push(['ICMS + PIS + COFINS (saldo)', ta, tb, tb - ta]);
      return { c: c, rows: rows };
    };
    var c1 = cmpL(false), c2 = cmpL(true);
    var linhasCmp = [['Corrigindo só os erros', '', '', '']].concat(c1.rows, [['', '', '', ''], ['Corrigindo erros e alertas', '', '', '']], c2.rows, [['', '', '', ''], ['De onde vem a diferença (erros e alertas)', 'ICMS', 'PIS', 'COFINS']],
      c2.c.grupos.map(function (g) { return [(COD_TIT[g.cod] || g.cod) + ' (' + g.n + ')', g.icms, g.pis, g.cof]; }));
    abas.push({ nome: 'Antes x depois', titulo: tit, filtro: false, cols: [{ t: 'Item', w: 44 }, { t: 'Como as notas foram emitidas', w: 22, f: 'din' }, { t: 'Após as correções', w: 20, f: 'din' }, { t: 'Diferença', w: 16, f: 'din' }], rows: linhasCmp });

    // Classificação fiscal
    var cls = produtosClassif(ds).sort(function (a, b) { return (b.venda - a.venda) || b.div.length - a.div.length || b.v - a.v; });
    abas.push({ nome: 'Classificação fiscal', titulo: tit + ' · regras revisadas em ' + Regras.REVISAO + ' · ' + (REGIMES.filter(function (r) { return r[0] === regimeEmp(); })[0] || [])[1], cols: [{ t: 'Origem', w: 10 }, { t: 'Produto', w: 40 }, { t: 'Código', w: 12 }, { t: 'NCM', w: 10 }, { t: 'CEST', w: 9 }, { t: 'Valor', w: 13, f: 'din' }, { t: 'PIS/COFINS esperado', w: 22 }, { t: 'CST PIS/COFINS esperado', w: 10 }, { t: 'CST PIS/COFINS na nota', w: 12 }, { t: 'ICMS esperado (SP, consumidor final)', w: 30 }, { t: 'CST ICMS na nota', w: 12 }, { t: 'Carga ICMS na nota', w: 12 }, { t: 'ST em SP', w: 14 }, { t: 'CBS/IBS', w: 16 }, { t: 'cClassTrib', w: 10 }, { t: 'Situação', w: 12 }, { t: 'Base legal PIS/COFINS', w: 40 }, { t: 'Base legal ICMS', w: 40 }, { t: 'Base legal CBS/IBS', w: 30 }],
      rows: cls.map(function (g) { var c = g.c; return [g.venda ? 'Vendido' : 'Comprado', g.x, g.cp || '', g.ncm, g.cest || '', g.v, { mono: 'Monofásico', st: 'ST', zero: 'Alíquota zero', normal: 'Tributado' }[c.pc.trat], c.pc.cst, g.venda ? Object.keys(g.cP).join(', ') : '', c.icms.titulo, g.venda ? Object.keys(g.cI).join(', ') : '', g.venda ? Object.keys(g.carga).map(function (x) { return x + '%'; }).join(', ') : '', c.st.st === 'sim' ? 'Sim' : c.st.st === 'cest' ? 'Depende do CEST' : 'Não', c.cbs.titulo, c.cbs.cClassTrib, g.venda ? (g.div.length ? 'Divergente' : (c.pc.cond || c.icms.cond || c.st.st === 'cest') ? 'Conferir' : 'Confere') : '', c.pc.regra ? c.pc.regra.l : '', c.icms.regra ? c.icms.regra.l : 'RICMS/SP, art. 52, I (18%)', c.cbs.regra ? c.cbs.regra.l : '']; }) });

    // Notas
    var notas = S.res.notas.filter(function (n) { return ds.indexOf(n.dt) >= 0; }).slice().sort(function (a, b) { return a.dt < b.dt ? -1 : a.dt > b.dt ? 1 : 0; });
    var tipoDoc = function (n) { return n.tipo === 'cte' ? 'CT-e' : n.tipo === 'nfse' ? 'NFS-e' : n.mod === '65' ? 'NFC-e' : 'NF-e'; };
    abas.push({ nome: 'Notas', titulo: tit, cols: [{ t: 'Data', w: 11, f: 'data' }, { t: 'Tipo', w: 11 }, { t: 'Documento', w: 8 }, { t: 'Número', w: 11 }, { t: 'Chave de acesso', w: 47 }, { t: 'Emitente / destinatário', w: 36 }, { t: 'CNPJ/CPF', w: 19 }, { t: 'UF', w: 5 }, { t: 'Operação', w: 13 }, { t: 'Valor', w: 14, f: 'din' }, { t: 'ICMS (débito ou crédito)', w: 14, f: 'din' }, { t: 'PIS', w: 12, f: 'din' }, { t: 'COFINS', w: 12, f: 'din' }, { t: 'Auditoria', w: 16 }, { t: 'Tratamento', w: 50 }, { t: 'Situação', w: 18 }, { t: 'Anotação', w: 40 }],
      rows: notas.map(function (n) {
        var t = n.T, S_ = n.dir === 'S', a = acompDe(n.ch);
        var aud = n.pior && n.pior !== 'info' ? (resolvida(n.ch) ? n.nIss + ' resolvido(s)' : n.nIss + (n.pior === 'erro' ? ' com erro' : ' alerta(s)')) : 'Correta';
        return [n.dt, n.dir === 'S' ? 'Saída' : n.dir === 'X' ? 'Informativo' : 'Entrada', tipoDoc(n), String(n.n), n.ch, n.parte.n || 'Consumidor final', fmtCnpj(n.parte.c), n.parte.uf || '', n.tipo === 'cte' || n.tipo === 'nfse' ? '' : (n.interna ? 'Interna' : 'Interestadual'), n.vNF, S_ ? t.icmsD : t.icmsC, S_ ? t.pisD : t.pisC, S_ ? t.cofD : t.cofC, aud, n.info || '', a ? SIT[a.s] : '', a ? a.t || '' : ''];
      }) });

    // Itens das NF-e
    var itens = [];
    notas.forEach(function (r) {
      var n = notaPorChave(r.ch); if (!n || !n.it) return;
      n.it.forEach(function (it) { itens.push([r.dt, r.dir === 'S' ? 'Saída' : 'Entrada', String(n.n), n.ch, r.parte.n || 'Consumidor final', it.k, it.cp || '', it.x, it.ncm, it.cest || '', it.cf, (it.o || '') + (it.cst || ''), (it.vp || 0) - (it.vd || 0), it.bc, it.p, it.v, it.vst || it.stR || 0, it.cP || '', it.vP, it.vC]); });
    });
    abas.push({ nome: 'Itens das notas', titulo: tit, cols: [{ t: 'Data', w: 11, f: 'data' }, { t: 'Tipo', w: 9 }, { t: 'Número', w: 10 }, { t: 'Chave', w: 47 }, { t: 'Emitente / destinatário', w: 32 }, { t: 'Item', w: 6, f: 'int' }, { t: 'Código', w: 12 }, { t: 'Produto', w: 40 }, { t: 'NCM', w: 10 }, { t: 'CEST', w: 9 }, { t: 'CFOP', w: 7 }, { t: 'CST ICMS', w: 8 }, { t: 'Valor', w: 13, f: 'din' }, { t: 'Base ICMS', w: 13, f: 'din' }, { t: 'Alíq. ICMS %', w: 9, f: 'pct' }, { t: 'ICMS', w: 12, f: 'din' }, { t: 'ICMS-ST', w: 12, f: 'din' }, { t: 'CST PIS/COFINS', w: 9 }, { t: 'PIS', w: 11, f: 'din' }, { t: 'COFINS', w: 11, f: 'din' }], rows: itens });

    // Pendências
    var ord = { erro: 0, alerta: 1, info: 2 };
    abas.push({ nome: 'Pendências', titulo: tit, cols: [{ t: 'Gravidade', w: 10 }, { t: 'Imposto', w: 14 }, { t: 'Origem', w: 11 }, { t: 'Data', w: 11, f: 'data' }, { t: 'Número', w: 10 }, { t: 'Chave', w: 47 }, { t: 'Emitente / destinatário', w: 32 }, { t: 'Item', w: 6, f: 'int' }, { t: 'NCM', w: 10 }, { t: 'Produto', w: 36 }, { t: 'Ocorrência', w: 30 }, { t: 'O que corrigir', w: 70 }, { t: 'Impacto estimado', w: 14, f: 'din' }, { t: 'Situação', w: 18 }, { t: 'Anotação', w: 40 }],
      rows: pendT.slice().sort(function (a, b) { return ord[a.sev] - ord[b.sev] || (a.dt < b.dt ? -1 : 1); }).map(function (p) { var a = acompDe(p.ch); return [{ erro: 'Erro', alerta: 'Alerta', info: 'Aviso' }[p.sev], IMP_LBL[impDe(p)], p.quem === 'cliente' ? 'Cliente' : 'Fornecedor', p.dt, String(p.n), p.ch, p.parte || 'Consumidor final', p.item || '', p.ncm || '', p.x || '', COD_TIT[p.cod] || p.cod, p.msg, p.imp || 0, a ? SIT[a.s] : 'Em aberto', a ? a.t || '' : '']; }) });

    // Produtos
    var prods = Object.values(S.res.produtos).sort(function (a, b) { return b.v - a.v; });
    abas.push({ nome: 'Produtos', titulo: nome + ' · CNPJ ' + fmtCnpj(cnpj) + ' · produtos comprados (todas as notas)', cols: [{ t: 'Produto', w: 44 }, { t: 'Código', w: 12 }, { t: 'Fornecedor', w: 34 }, { t: 'CNPJ fornecedor', w: 19 }, { t: 'NCM', w: 10 }, { t: 'Monofásico PIS/COFINS', w: 12 }, { t: 'Saiu da ST', w: 9 }, { t: 'Compras', w: 14, f: 'din' }, { t: 'Nº de compras', w: 9, f: 'int' }, { t: 'Última compra', w: 12, f: 'data' }, { t: 'Classificação', w: 18 }, { t: 'Origem da classificação', w: 32 }],
      rows: prods.map(function (p) { return [p.x, p.cp || '', p.fn, fmtCnpj(p.fc), p.ncm, p.mono ? 'Sim' : p.monoCond ? 'Depende' : 'Não', p.st ? 'Sim' : 'Não', p.v, p.n, p.ult, p.classe === 'pendente' ? 'Sem classificação' : nomeClasse(p.classe), ORIGEM[p.origem] || '']; }) });

    // Serviços e fretes
    var serv = Object.values(S.res.servicos).sort(function (a, b) { return b.v - a.v; });
    if (serv.length) abas.push({ nome: 'Serviços tomados', titulo: tit, cols: [{ t: 'Prestador', w: 36 }, { t: 'CNPJ', w: 19 }, { t: 'Código', w: 9 }, { t: 'Serviço', w: 40 }, { t: 'Descrição', w: 50 }, { t: 'Valor', w: 14, f: 'din' }, { t: 'Notas', w: 7, f: 'int' }, { t: 'Classificação', w: 18 }],
      rows: serv.map(function (x) { return [x.fn, fmtCnpj(x.fc), x.cod, x.x, x.desc || '', x.v, x.n, x.classe === 'pendente' ? 'Sem classificação' : x.classe === 'insumo' ? 'Insumo de serviço' : 'Sem crédito']; }) });
    var fr = S.res.fretes.filter(function (f) { return ds.indexOf(f.dt) >= 0; });
    if (fr.length) abas.push({ nome: 'Fretes (CT-e)', titulo: tit, cols: [{ t: 'Data', w: 11, f: 'data' }, { t: 'CT-e', w: 10 }, { t: 'Chave', w: 47 }, { t: 'Trajeto', w: 16 }, { t: 'Transportadora', w: 36 }, { t: 'Tomadora', w: 9 }, { t: 'Papel da empresa', w: 16 }, { t: 'Quem paga', w: 30 }, { t: 'Valor', w: 13, f: 'din' }, { t: 'Crédito ICMS', w: 13, f: 'din' }, { t: 'Crédito PIS/COFINS', w: 13, f: 'din' }],
      rows: fr.map(function (f) { return [f.dt, String(f.n), f.ch, f.rota || '', f.transp, f.tomadora ? 'Sim' : 'Não', f.papel || '', f.toma || '', f.v, f.credICMS, f.credPC]; }) });

    var blob = await Planilha.gerar(abas);
    var sufixo = S.periodo === 'all' ? 'completo' : S.periodo.slice(2);
    salvarArquivo('apuracao_' + cnpj + '_' + sufixo + '.xlsx', blob);
  } catch (err) { toast('Não foi possível gerar o Excel: ' + erroTexto(err)); }
  S.gerando = false; renderMain();
}

/* ---------- visualização da nota ---------- */
async function compactar(texto) {
  var bytes = new TextEncoder().encode(texto);
  if (typeof CompressionStream !== 'undefined') {
    var gzb = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
    return 'gz:' + b64(gzb);
  }
  return 'raw:' + b64(bytes);
}
async function descompactar(v) {
  var tipo = v.slice(0, v.indexOf(':')), u = unb64(v.slice(v.indexOf(':') + 1));
  if (tipo === 'gz') u = new Uint8Array(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  return new TextDecoder().decode(u);
}
function b64(u) { var s = '', CH = 0x8000; for (var i = 0; i < u.length; i += CH) s += String.fromCharCode.apply(null, u.subarray(i, i + CH)); return btoa(s); }
function unb64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }

function notaPorChave(ch) {
  if (!S.emp._idx || S.emp._idxN !== S.emp.notas.length) { S.emp._idx = {}; S.emp.notas.forEach(function (n) { S.emp._idx[n.ch] = n; }); S.emp._idxN = S.emp.notas.length; }
  return S.emp._idx[ch];
}
async function abrirNota(ch) {
  S.ver = { ch: ch, xml: null, carregando: true, semXml: false };
  document.body.style.overflow = 'hidden'; renderVer();
  try {
    var tx = S.emp.xmls && S.emp.xmls[ch];
    if (!tx && !S.exemplo) { var v = await B.xmlDe(ch); if (v) tx = await descompactar(v); }
    if (S.ver && S.ver.ch === ch) { S.ver.xmlTexto = tx || null; S.ver.xml = tx ? new DOMParser().parseFromString(tx, 'application/xml') : null; S.ver.semXml = !tx; }
  } catch (e) { if (S.ver) S.ver.semXml = true; }
  if (S.ver && S.ver.ch === ch) { S.ver.carregando = false; renderVer(); }
}
function fecharNota() { S.ver = null; document.body.style.overflow = ''; var el = $('ver'); if (el) el.remove(); }
function baixarXml() {
  if (!S.ver || !S.ver.xmlTexto) return;
  salvarArquivo(S.ver.ch + '.xml', new Blob([S.ver.xmlTexto], { type: 'application/xml' }));
}
function xt(el, tag) { if (!el) return ''; var l = el.getElementsByTagName(tag); return l.length ? String(l[0].textContent || '').trim() : ''; }
function xel(el, tag) { if (!el) return null; var l = el.getElementsByTagName(tag); return l.length ? l[0] : null; }
function endereco(el) {
  if (!el) return '';
  var p = [xt(el, 'xLgr') + (xt(el, 'nro') ? ', ' + xt(el, 'nro') : ''), xt(el, 'xCpl'), xt(el, 'xBairro'), (xt(el, 'xMun') ? xt(el, 'xMun') + (xt(el, 'UF') ? '/' + xt(el, 'UF') : '') : ''), xt(el, 'CEP') ? 'CEP ' + xt(el, 'CEP').replace(/^(\d{5})(\d{3})$/, '$1-$2') : ''];
  return p.filter(Boolean).join(' · ');
}
var TPAG = { '01': 'Dinheiro', '02': 'Cheque', '03': 'Cartão de crédito', '04': 'Cartão de débito', '05': 'Crédito loja', '10': 'Vale-alimentação', '11': 'Vale-refeição', '12': 'Vale-presente', '13': 'Vale-combustível', '15': 'Boleto', '16': 'Depósito', '17': 'PIX', '18': 'Transferência', '19': 'Fidelidade', '90': 'Sem pagamento', '99': 'Outros' };
var MODFRETE = { '0': 'Por conta do emitente (CIF)', '1': 'Por conta do destinatário (FOB)', '2': 'Por conta de terceiros', '3': 'Transporte próprio do remetente', '4': 'Transporte próprio do destinatário', '9': 'Sem frete' };
function bloco(titulo, linhas) {
  linhas = linhas.filter(function (l) { return l && l[1]; });
  if (!linhas.length) return '';
  return '<div class="bloco"><div class="eyebrow">' + titulo + '</div>' + linhas.map(function (l) { return '<div><span class="small">' + l[0] + '</span><div>' + l[1] + '</div></div>'; }).join('') + '</div>';
}
function vNota() {
  var v = S.ver, n = notaPorChave(v.ch);
  if (!n) return '<div class="doc"><p>Nota não encontrada.</p><button class="btn" type="button" data-act="fecharNota">Fechar</button></div>';
  var r = S.res.notas.filter(function (x) { return x.ch === v.ch; })[0] || {};
  var pend = S.res.pend.filter(function (p) { return p.ch === v.ch; });
  var x = v.xml, tipo = n.tipoDoc === 'cte' ? 'CT-e' : n.tipoDoc === 'nfse' ? 'NFS-e' : n.mod === '65' ? 'NFC-e' : 'NF-e';
  var h = '<div class="doc"><div class="ver-top no-print"><div class="row" style="gap:8px">' +
    (v.xmlTexto ? '<button class="btn" type="button" data-act="baixarXml">' + I.up.replace('M12 16V4M7 9l5-5 5 5', 'M12 4v12M7 11l5 5 5-5') + 'Baixar XML</button>' : '') +
    '<button class="btn" type="button" data-act="imprimirNota">Imprimir</button>' + (!S.readonly && !S.exemplo ? '<button class="btn" type="button" data-act="anotarNota">Anotar</button>' : '') +
    '</div><button class="btn ghost" type="button" data-act="fecharNota" aria-label="Fechar">Fechar ✕</button></div>';
  h += '<div class="ver-head"><div><span class="eyebrow">' + tipo + ' · ' + (r.dir === 'S' ? 'Saída' : r.dir === 'X' ? 'Informativo' : 'Entrada') + '</span><h2 style="font-size:26px">Nº ' + esc(n.n) + (n.s ? ' <span class="small">série ' + esc(n.s) + '</span>' : '') + '</h2>' +
    '<div class="small mono" style="overflow-wrap:anywhere">' + esc(n.ch.replace(/(\d{4})(?=\d)/g, '$1 ')) + '</div></div>' +
    '<div class="r"><div class="small">Emissão</div><b>' + brFull(n.dt) + '</b>' + (x && xt(x, 'nProt') ? '<div class="small">Protocolo ' + esc(xt(x, 'nProt')) + '</div>' : '') +
    '<div style="margin-top:6px">' + (r.pior && r.pior !== 'info' ? '<span class="pill ' + (resolvida(v.ch) ? 'ok' : r.pior) + '">' + pend.filter(function (p) { return p.sev !== 'info'; }).length + (resolvida(v.ch) ? ' resolvido(s)' : ' ponto(s) da auditoria') + '</span>' : '<span class="pill ok">Correta</span>') + '</div></div></div>';
  if (r.info) h += '<div class="banner ok"><span class="grow">' + esc(r.info.charAt(0).toUpperCase() + r.info.slice(1)) + '</span></div>';
  var ac = acompDe(v.ch);
  if (ac) h += '<div class="banner info"><span class="grow"><b>' + SIT[ac.s] + '.</b> ' + esc(ac.t || '') + ' <span class="small">(' + new Date(ac.em).toLocaleDateString('pt-BR') + ')</span></span></div>';

  if (n.tipoDoc === 'cte') h += vCte(n, x);
  else if (n.tipoDoc === 'nfse') h += vNfse(n, x);
  else h += vNfe(n, x, pend);

  var notaToda = pend.filter(function (p) { return !p.item; });
  if (pend.length && n.tipoDoc) notaToda = pend;
  if (notaToda.length) h += '<div><h3>Auditoria</h3>' + notaToda.map(function (p) { return '<div class="issue ' + p.sev + '"><b>' + esc(COD_TIT[p.cod] || p.cod) + '.</b> ' + esc(p.msg) + '</div>'; }).join('') + '</div>';
  if (v.carregando) h += '<p class="small">Carregando o XML original…</p>';
  else if (v.semXml) h += '<p class="note">O XML original desta nota não está guardado (ela foi importada antes desta versão do portal). Reimporte o arquivo para ver endereços, transporte, cobrança e informações complementares e para baixar o XML.</p>';
  h += '</div>';
  return h;
}
function vNfe(n, x, pend) {
  var ide = x && xel(x, 'ide'), emit = x && xel(x, 'emit'), dest = x && xel(x, 'dest'), tot = x && xel(x, 'ICMSTot'), transp = x && xel(x, 'transp');
  var h = '<div class="blocos">' +
    bloco('Emitente', [['Razão social', esc(n.eN)], ['CNPJ', esc(fmtCnpj(n.eC))], ['IE', esc(xt(emit, 'IE'))], ['Endereço', esc(endereco(xel(emit, 'enderEmit')))]]) +
    bloco('Destinatário', [['Razão social', esc(n.dN || 'Consumidor final')], ['CNPJ/CPF', esc(fmtCnpj(n.dC))], ['IE', esc(xt(dest, 'IE'))], ['Endereço', esc(endereco(xel(dest, 'enderDest')))]]) +
    bloco('Operação', [['Natureza', esc(n.nat || xt(ide, 'natOp'))], ['Tipo na nota', n.tp === '0' ? 'Entrada' : 'Saída'], ['Destino', n.idDest === '1' ? 'Interna' : n.idDest === '2' ? 'Interestadual' : n.idDest === '3' ? 'Exterior' : ''], ['Finalidade', { '1': 'Normal', '2': 'Complementar', '3': 'Ajuste', '4': 'Devolução' }[n.fin] || '']]) +
    '</div>';
  h += '<div><h3>Itens</h3><div class="tscroll"><table class="itens"><thead><tr><th>#</th><th>Produto</th><th>NCM / CEST</th><th>CFOP</th><th>CST</th><th class="r">Valor</th><th class="r">Base ICMS</th><th class="r">ICMS</th><th class="r">ST</th><th>PIS/COFINS</th></tr></thead><tbody>';
  n.it.forEach(function (it) {
    var ps = pend.filter(function (p) { return p.item === it.k; }), pior = ps.some(function (p) { return p.sev === 'erro'; }) ? 'erro' : ps.some(function (p) { return p.sev === 'alerta'; }) ? 'alerta' : '';
    h += '<tr class="' + (pior ? 'tem-' + pior : '') + '"><td class="num">' + it.k + '</td><td>' + esc(it.x) + '<div class="small">Cód. ' + esc(it.cp || '–') + '</div></td><td class="mono">' + esc(it.ncm) + (it.ex ? ' ex ' + esc(it.ex) : '') + (it.cest ? '<div class="small">' + esc(it.cest) + '</div>' : '') + '</td><td class="num">' + esc(it.cf) + '</td><td class="num">' + esc(it.o + it.cst) + '</td><td class="r num">' + m0(it.vp - it.vd) + '</td><td class="r num">' + m0(it.bc) + '</td><td class="r num">' + m0(it.v) + (it.p ? '<div class="small">' + it.p + '%</div>' : '') + '</td><td class="r num">' + (it.vst ? m0(it.vst) : it.stR ? '<span class="small">ret. ' + m0(it.stR) + '</span>' : '–') + '</td><td class="num">CST ' + esc(it.cP || '–') + (it.vP || it.vC ? '<div class="small">' + m0(it.vP) + ' / ' + m0(it.vC) + '</div>' : '') + '</td></tr>';
    if (ps.length) h += '<tr class="tem-' + pior + '"><td></td><td colspan="9">' + ps.map(function (p) { return '<div class="issue ' + p.sev + '"><b>' + esc(COD_TIT[p.cod] || p.cod) + '.</b> ' + esc(p.msg) + '</div>'; }).join('') + '</td></tr>';
  });
  h += '</tbody></table></div></div>';
  var t = n.t || {};
  h += '<div class="blocos">' + bloco('Totais', [['Produtos', m0(t.vProd)], ['ICMS', m0(t.vICMS)], ['ICMS-ST', t.vST ? m0(t.vST) : ''], ['IPI', t.vIPI ? m0(t.vIPI) : ''], ['PIS / COFINS', m0(t.vPIS) + ' / ' + m0(t.vCOF)], ['IBS / CBS', (t.vIBS || t.vCBS) ? m0(t.vIBS) + ' / ' + m0(t.vCBS) : ''], ['Valor da nota', '<b>' + m0(t.vNF) + '</b>']]);
  if (x) {
    var tr = xel(transp, 'transporta'), vol = xel(transp, 'vol');
    h += bloco('Transporte', [['Frete', esc(MODFRETE[xt(transp, 'modFrete')] || '')], ['Transportadora', esc(xt(tr, 'xNome'))], ['CNPJ', esc(fmtCnpj(xt(tr, 'CNPJ')))], ['Volumes', vol ? esc((xt(vol, 'qVol') || '') + (xt(vol, 'esp') ? ' ' + xt(vol, 'esp') : '') + (xt(vol, 'pesoB') ? ' · ' + xt(vol, 'pesoB') + ' kg' : '')) : '']]);
    var dups = x.getElementsByTagName('dup'), pags = x.getElementsByTagName('detPag');
    var cob = []; for (var i = 0; i < dups.length && i < 12; i++) cob.push(['Parcela ' + esc(xt(dups[i], 'nDup')), brFull(xt(dups[i], 'dVenc')) + ' · ' + m0(+xt(dups[i], 'vDup'))]);
    for (var j = 0; j < pags.length && j < 6; j++) cob.push(['Pagamento', esc(TPAG[xt(pags[j], 'tPag')] || xt(pags[j], 'tPag')) + ' · ' + m0(+xt(pags[j], 'vPag'))]);
    h += bloco('Cobrança e pagamento', cob);
  }
  h += '</div>';
  if (x && (xt(x, 'infCpl') || xt(x, 'infAdFisco'))) h += '<div class="bloco"><div class="eyebrow">Informações complementares</div><div class="small" style="white-space:pre-wrap">' + esc(xt(x, 'infAdFisco') + (xt(x, 'infAdFisco') ? '\n' : '') + xt(x, 'infCpl')) + '</div></div>';
  return h;
}
function vCte(n, x) {
  var c = n.cte, pt = function (p) { return p && p.c ? esc(p.n) + '<div class="small">' + esc(fmtCnpj(p.c)) + (p.uf ? ' · ' + esc(p.uf) : '') + '</div>' : ''; };
  var h = '<div class="blocos">' + bloco('Transportadora', [['Razão social', esc(n.eN)], ['CNPJ', esc(fmtCnpj(n.eC))]]) +
    bloco('Partes', [['Tomador (paga o frete)', pt(c.toma)], ['Remetente', pt(c.rem)], ['Destinatário', pt(c.dest)], ['Expedidor', pt(c.exped)], ['Recebedor', pt(c.receb)]]) +
    bloco('Prestação', [['Trajeto', esc((c.munIni || '') + '/' + c.ufIni + ' → ' + (c.munFim || '') + '/' + c.ufFim)], ['CFOP', esc(c.cfop)], ['Valor do frete', '<b>' + m0(c.vT) + '</b>'], ['ICMS', 'CST ' + esc(c.cst || '–') + ' · base ' + m0(c.bc) + ' · ' + c.p + '% · ' + m0(c.v)], ['Carga', x ? esc((xt(x, 'proPred') || '') + (xt(x, 'vCarga') ? ' · ' + m0(+xt(x, 'vCarga')) : '')) : '']]) + '</div>';
  if (c.nfes && c.nfes.length) h += '<div class="bloco"><div class="eyebrow">Notas transportadas</div>' + c.nfes.map(function (k) { var nn = notaPorChave(k); return '<div class="small mono">' + (nn ? '<button type="button" class="link" data-ver="' + esc(k) + '">NF-e ' + esc(nn.n) + '</button> · ' : '') + esc(k) + '</div>'; }).join('') + '</div>';
  return h;
}
function vNfse(n, x) {
  var s = n.nfse;
  var h = '<div class="blocos">' + bloco('Prestador', [['Razão social', esc(n.eN)], ['CNPJ', esc(fmtCnpj(n.eC))], ['Endereço', x ? esc(endereco(xel(xel(x, 'emit'), 'enderNac'))) : '']]) +
    bloco('Tomador', [['Nome', esc(n.dN || '')], ['CNPJ/CPF', esc(fmtCnpj(n.dC))]]) +
    bloco('Serviço', [['Código', esc(s.cTribNac)], ['Descrição', esc(s.xTrib)], ['Município de incidência', esc(s.munIncid)]]) +
    bloco('Valores', [['Serviço', '<b>' + m0(s.vServ) + '</b>'], ['Desconto', s.vDesc ? m0(s.vDesc) : ''], ['ISS', m0(s.vISS) + ' (' + s.aliqISS + '%) · ' + (s.tpRetISS === '2' ? 'retido pelo tomador' : s.tpRetISS === '3' ? 'retido pelo intermediário' : 'não retido')], ['PIS / COFINS', 'CST ' + esc(s.cstPC || '–') + ' · ' + m0(s.vPis) + ' / ' + m0(s.vCof)], ['Retenções federais', (s.retIR || s.retCSLL || s.retCP) ? 'IR ' + m0(s.retIR) + ' · CSLL ' + m0(s.retCSLL) + ' · INSS ' + m0(s.retCP) : '']]) + '</div>';
  var desc = x ? xt(x, 'xDescServ').replace(/\\n/g, '\n') : s.desc;
  if (desc) h += '<div class="bloco"><div class="eyebrow">Discriminação do serviço</div><div class="small" style="white-space:pre-wrap">' + esc(desc) + '</div></div>';
  return h;
}
function renderVer() {
  var el = $('ver');
  if (!S.ver) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'ver'; el.className = 'ver'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); document.body.appendChild(el); }
  el.innerHTML = vNota();
}
document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && S.ver) fecharNota(); });
document.addEventListener('click', function (ev) { if (S.ver && ev.target && ev.target.id === 'ver') fecharNota(); });

/* ---------- eventos ---------- */
document.addEventListener('click', function (ev) {
  var b = ev.target.closest('button'); if (!b) return;
  var d = b.dataset;
  if (d.per) { S.periodo = d.per; renderMain(); return; }
  if (d.grupo) { S.grupo = d.grupo; S.periodo = 'all'; renderMain(); return; }
  if (d.det) { S.det = d.det; renderMain(); return; }
  if (d.tab) { var fora = !b.closest('.tabs'); S.tab = d.tab; ls('pf.tab', S.tab); renderMain(); if (fora) { var pa = document.querySelector('.painel-abas'); if (pa) pa.scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
  if (d.fquem) { S.fQuem = d.fquem; renderMain(); return; }
  if (d.fsev) { S.fSev = d.fsev; renderMain(); return; }
  if (d.fimp) { S.fImp = d.fimp; renderMain(); return; }
  if (d.fprod) { S.fProd = d.fprod; renderMain(); return; }
  if (d.fsit) { S.fSit = d.fsit; renderMain(); return; }
  if (d.fnota) { S.fNota = d.fnota; renderMain(); return; }
  if (d.ver) { abrirNota(d.ver); return; }
  if (d.apv) { S.apVisao = d.apv; renderMain(); return; }
  if (d.cmpal) { S.cmpAlertas = d.cmpal === 'true'; renderMain(); return; }
  if (d.fcls) { S.fCls = d.fcls; if (d.fcls === 'compra' && S.fClsDiv === 'div') S.fClsDiv = 'todos'; renderMain(); return; }
  if (d.fclsdiv) { S.fClsDiv = d.fclsdiv; renderMain(); return; }
  if (d.cncm !== undefined) { S.cq = Object.assign({ destino: 'cf', uf: 'SP', contrib: false, importado: false }, S.cq || {}, { ncm: d.cncm, cest: d.ccest || '' }); renderMain(); var fc = $('fClassif'); if (fc) fc.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  if (d.ac) { S.editAc = d.ac; renderMain(); var fe = $('fAcomp'); if (fe) fe.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  if (d.modo) { S.modo = d.modo; render(); return; }
  if (d.login) { S.telaLogin = d.login; S.erro = ''; S.aviso = ''; render(); return; }
  if (d.classe) { if (!S.readonly) classificar(d.pk, d.ncm, d.classe); return; }
  if (d.gclasse) { if (!S.readonly) classificarGrupo(d.gtipo, d.gchave, d.gclasse); return; }
  if (d.gprod) { S.gProd = d.gprod; renderMain(); return; }
  if (d.fncm) { S.fNcm = d.fncm; S.fNome = ''; renderMain(); return; }
  if (d.fforn) { S.fForn = d.fforn; renderMain(); return; }
  if (d.limpafiltro) { S.fNcm = ''; S.fNome = ''; S.fForn = ''; renderMain(); return; }
  if (d.cserv) { if (!S.readonly) classificarServ(d.pk, d.cserv); return; }
  if (d.pedeeq) { S.confirmEquipe = d.pedeeq; render(); return; }
  if (d.rmeq) { B.removerEquipe(d.rmeq).then(function () { S.confirmEquipe = null; toast('Removido da equipe.'); carregarEquipe(); }).catch(function (e) { toast(erroTexto(e)); }); return; }
  if (d.desfazer) { desfazerClasse(d.desfazer, d.origem, d.ncm); return; }
  if (d.abrir) { abrirDoBanco(d.abrir, !(S.usuario && S.usuario.papel === 'escritorio')); return; }
  if (d.remover) {
    B.removerAcesso(S.emp.id, d.remover).then(function () { toast('Acesso removido.'); carregarAcessos(); }).catch(function (e) { toast(erroTexto(e)); });
    return;
  }
  var a = d.act;
  if (a === 'exemplo') carregarExemplo();
  if (a === 'copiarDemo') { var url = linkDemo(); (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { toast('Link copiado: ' + url); }).catch(function () { window.prompt('Copie o link de demonstração:', url); }); return; }
  else if (a === 'sair') { B.sair().then(function () { S.usuario = null; S.emp = null; S.empresas = []; S.view = 'login'; S.telaLogin = 'entrar'; render(); }); }
  else if (a === 'inicio' || a === 'voltar') { if (S.usuario || S.demo) voltarEmpresas(); else { S.emp = null; S.exemplo = false; S.view = 'login'; render(); } }
  else if (a === 'csv') csv();
  else if (a === 'tour') iniciarTour();
  else if (a === 'tourProx') passoTour(1);
  else if (a === 'tourVolta') passoTour(-1);
  else if (a === 'tourFim') fecharTour();
  else if (a === 'tema') { var novo = temaAtual() === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', novo); ls('pf.tema', novo); var mt = document.querySelector('meta[name=theme-color]'); if (mt) mt.content = novo === 'dark' ? '#0d1830' : '#101b33'; render(); }
  else if (a === 'excel') baixarExcel();
  else if (a === 'imprimirPainel') imprimirPainel();
  else if (a === 'fecharNota') fecharNota();
  else if (a === 'baixarXml') baixarXml();
  else if (a === 'imprimirNota') window.print();
  else if (a === 'anotarNota') { var chN = S.ver.ch; fecharNota(); S.tab = 'notas'; S.editAc = chN; renderMain(); var fe2 = $('fAcomp'); if (fe2) fe2.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  else if (a === 'fecharAc') { S.editAc = null; renderMain(); }
  else if (a === 'limparAc') {
    var chL = S.editAc, antL = S.emp.acomp[chL];
    delete S.emp.acomp[chL]; S.editAc = null; renderMain();
    B.removerAcompanhamento(S.emp.id, chL).then(function () { toast('Anotação removida.'); }).catch(function (e) { S.emp.acomp[chL] = antL; renderMain(); toast('Não foi possível remover: ' + erroTexto(e)); });
  }
  else if (a === 'cancelaEq') { S.confirmEquipe = null; render(); }
  else if (a === 'publicar') publicar();
  else if (a === 'irProdutos') { S.tab = 'produtos'; S.fProd = 'pendente'; renderMain(); }
  else if (a === 'aplicarMono') {
    var lista = $('mono').value.split(/\n+/).map(function (s) { return s.trim().replace(/\s+/g, ' '); }).filter(function (s) { return /^\d/.test(s); });
    var stl = $('stl') ? $('stl').value.split(/\s+/).map(function (s) { return s.replace(/\D/g, ''); }).filter(Boolean) : S.emp.meta.st;
    var corte = $('corte') ? $('corte').value || '2026-10-01' : S.emp.meta.corte;
    S.emp.meta.mono = lista; S.emp.meta.st = stl; S.emp.meta.corte = corte; recalcular(); render();
    var msg = (lista.length && stl.length) ? 'Análise recalculada.' : 'Lista vazia: a análise usa a lista padrão.';
    if (S.exemplo) { toast(msg); return; }
    B.salvarEmpresa(S.emp.id, { ncm_monofasico: lista, ncm_st: stl, corte_st: corte }).then(function () { toast(msg + ' Salvo.'); }).catch(function (e) { toast('Não foi possível salvar: ' + erroTexto(e)); });
  }
  else if (a === 'salvarSeg') {
    var sg = $('segm').value, rg = $('regm').value;
    S.emp.meta.segmento = sg; S.emp.meta.regime = rg; S._cls = {}; S.cq = null; recalcular(); render();
    if (S.exemplo) { toast('Análise recalculada.'); return; }
    B.salvarEmpresa(S.emp.id, { segmento: sg, regime: rg }).then(function () { toast('Segmento e regime salvos. Análise recalculada.'); }).catch(function (e) { toast('Não foi possível salvar: ' + erroTexto(e)); });
  }
  else if (a === 'exclPrever') {
    var ini = $('exIni').value, fim = $('exFim').value, mes = $('exMes').value;
    if (!ini || !fim) { toast('Escolha o mês ou as datas de início e fim.'); return; }
    if (fim < ini) { toast('A data final é anterior à inicial.'); return; }
    S.excl = { aberto: true, mes: mes, ini: ini, fim: fim, confirmar: true }; renderOffice();
  }
  else if (a === 'exclNao') { S.excl = { aberto: true }; renderOffice(); }
  else if (a === 'exclSim') excluirPeriodo();
  else if (a === 'apagar') { S.confirmDel = true; renderOffice(); }
  else if (a === 'apagarNao') { S.confirmDel = false; renderOffice(); }
  else if (a === 'apagarSim') { B.apagarEmpresa(S.emp.id).then(function () { toast('Empresa apagada.'); voltarEmpresas(); }).catch(function (e) { toast(erroTexto(e)); }); }
});
document.addEventListener('submit', async function (ev) {
  ev.preventDefault();
  var f = ev.target;
  if (f.id === 'fClassif') {
    S.cq = { regime: $('cqReg').value, ncm: $('cqNcm').value.replace(/\D/g, ''), cest: $('cqCest').value.replace(/\D/g, ''), destino: $('cqDest').value, uf: $('cqUf').value, contrib: $('cqContrib').checked, importado: $('cqImp').checked };
    renderMain(); return;
  }
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
  } else if (f.id === 'fAcomp') {
    var chA = S.editAc, stA = $('acStatus').value, txA = $('acTexto').value.trim(), antA = S.emp.acomp[chA];
    S.emp.acomp[chA] = { s: stA, t: txA, em: new Date().toISOString() }; S.editAc = null; renderMain();
    try { await B.salvarAcompanhamento(S.emp.id, chA, stA, txA); toast('Acompanhamento salvo.'); }
    catch (e) { if (antA) S.emp.acomp[chA] = antA; else delete S.emp.acomp[chA]; renderMain(); toast('Não foi possível salvar: ' + erroTexto(e)); }
  } else if (f.id === 'fEquipe') {
    var eqE = $('eqEmail').value.trim(), eqS = $('eqSenha').value;
    try { var re = await B.adicionarEquipe(eqE, eqS); toast((re && re.criado ? 'Conta criada: ' : 'Adicionado à equipe: ') + eqE + '.'); carregarEquipe(); }
    catch (e) { toast('Não foi possível adicionar: ' + erroTexto(e)); }
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
  if (t.id === 'fForn') { S.fForn = t.value; renderMain(); return; }
  if (t.id === 'exMes') { var mm = t.value; if (mm) { var ult = new Date(Date.UTC(+mm.slice(0, 4), +mm.slice(5, 7), 0)).toISOString().slice(0, 10); $('exIni').value = mm + '-01'; $('exFim').value = ult; } return; }
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
    var e = { id: 'exemplo', meta: { cnpj: '12345678000190', nome: 'Pneus e Peças Exemplo Ltda (fictícia)', corte: '2026-10-01', mono: F.DEFAULT_MONO.slice(), st: F.DEFAULT_ST.slice(), publicado: null },
      notas: acc.notas, pub: {}, canc: acc.canc, prodCad: {}, ncmCad: {}, hist: [], acomp: {}, xmls: acc.xml };
    abrirEmpresa(e, S.demo || !(S.usuario && S.usuario.papel === 'escritorio'), true);
  } catch (err) { toast('Não foi possível carregar o exemplo.'); }
}

/* ---------- início ---------- */
var tab = ls('pf.tab'); if (tab) S.tab = tab;
if (/type=recovery/.test(location.hash)) S.view = 'recuperar';
B.aoMudarSessao(function (evento) {
  if (evento === 'PASSWORD_RECOVERY') { S.view = 'recuperar'; render(); }
});
if (/^#demo\b/.test(location.hash)) { S.demo = true; S.view = 'carregando'; render(); carregarExemplo(); }
else { render(); iniciar(); }
})();
