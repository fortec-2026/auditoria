/* ===== Cofre: criptografia dos arquivos publicados e rascunho local =====
   Arquivo publicado (data/<id>.json): { v, kdf, iter, salt, iv, gz, ct }
   - chave derivada da senha com PBKDF2-SHA256 (600 mil iterações)
   - conteúdo compactado (gzip) e cifrado com AES-GCM 256 bits
   Sem a senha, o arquivo no GitHub é ilegível. */
var Cofre = (function () {
  'use strict';
  var ITER = 600000;
  var enc = new TextEncoder(), dec = new TextDecoder();

  function b64(buf) {
    var u = new Uint8Array(buf), s = '', CH = 0x8000;
    for (var i = 0; i < u.length; i += CH) s += String.fromCharCode.apply(null, u.subarray(i, i + CH));
    return btoa(s);
  }
  function unb64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }

  async function stream(bytes, T) {
    var s = new Blob([bytes]).stream().pipeThrough(new T('gzip'));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  var temGzip = typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

  async function chave(senha, salt, iter) {
    var base = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, base,
      { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  async function cifrar(obj, senha) {
    var bytes = enc.encode(JSON.stringify(obj));
    var gz = false;
    if (temGzip) { bytes = await stream(bytes, CompressionStream); gz = true; }
    var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    var k = await chave(senha, salt, ITER);
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, bytes);
    return { v: 1, kdf: 'PBKDF2-SHA256', iter: ITER, salt: b64(salt), iv: b64(iv), gz: gz, ct: b64(ct) };
  }

  async function decifrar(pacote, senha) {
    if (!window.crypto || !crypto.subtle) throw new Error('navegador');
    if (!pacote || pacote.v !== 1 || !pacote.ct) throw new Error('formato');
    var k = await chave(senha, unb64(pacote.salt), pacote.iter || ITER);
    var bytes;
    try { bytes = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(pacote.iv) }, k, unb64(pacote.ct))); }
    catch (e) { throw new Error('senha'); }
    if (pacote.gz) {
      if (!temGzip) throw new Error('navegador');
      bytes = await stream(bytes, DecompressionStream);
    }
    return JSON.parse(dec.decode(bytes));
  }

  // 16 caracteres aleatórios (~79 bits): forte o bastante para um arquivo que fica público
  function gerarSenha() {
    var a = 'abcdefghjkmnpqrstuvwxyz23456789', r = crypto.getRandomValues(new Uint8Array(16)), s = '';
    for (var i = 0; i < r.length; i++) { if (i && i % 4 === 0) s += '-'; s += a[r[i] % a.length]; }
    return s;
  }
  function gerarId() {
    var a = 'abcdefghjkmnpqrstuvwxyz23456789', r = crypto.getRandomValues(new Uint8Array(10)), s = '';
    for (var i = 0; i < r.length; i++) s += a[r[i] % a.length];
    return s;
  }

  /* ---------- Rascunho local (IndexedDB) ---------- */
  var DB = 'portal-fiscal', ST = 'empresas';
  function abrir() {
    return new Promise(function (ok, erro) {
      var req = indexedDB.open(DB, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(ST, { keyPath: 'id' }); };
      req.onsuccess = function () { ok(req.result); };
      req.onerror = function () { erro(req.error); };
    });
  }
  async function tx(modo, fn) {
    var db = await abrir();
    return new Promise(function (ok, erro) {
      var t = db.transaction(ST, modo), st = t.objectStore(ST), r = fn(st);
      t.oncomplete = function () { ok(r && r.result); };
      t.onerror = function () { erro(t.error); };
    });
  }
  var local = {
    listar: function () { return tx('readonly', function (st) { return st.getAll(); }); },
    ler: function (id) { return tx('readonly', function (st) { return st.get(id); }); },
    gravar: function (obj) { return tx('readwrite', function (st) { return st.put(obj); }); },
    apagar: function (id) { return tx('readwrite', function (st) { return st.delete(id); }); }
  };

  /* ---------- Publicação via API do GitHub (opcional) ---------- */
  async function publicarGitHub(cfg, caminho, conteudoTexto, mensagem) {
    var base = 'https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + '/contents/' + caminho;
    var h = { 'Authorization': 'Bearer ' + cfg.token, 'Accept': 'application/vnd.github+json' };
    var sha;
    var atual = await fetch(base + '?ref=' + encodeURIComponent(cfg.branch || 'main'), { headers: h });
    if (atual.ok) sha = (await atual.json()).sha;
    else if (atual.status !== 404) throw new Error('github ' + atual.status);
    var corpo = { message: mensagem, content: b64(enc.encode(conteudoTexto)), branch: cfg.branch || 'main' };
    if (sha) corpo.sha = sha;
    var r = await fetch(base, { method: 'PUT', headers: h, body: JSON.stringify(corpo) });
    if (!r.ok) throw new Error('github ' + r.status);
    return true;
  }
  async function testarGitHub(cfg) {
    var r = await fetch('https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo, { headers: { 'Authorization': 'Bearer ' + cfg.token, 'Accept': 'application/vnd.github+json' } });
    if (!r.ok) throw new Error('github ' + r.status);
    var j = await r.json();
    if (!j.permissions || !j.permissions.push) throw new Error('sem permissão de escrita');
    return j;
  }

  return { cifrar: cifrar, decifrar: decifrar, gerarSenha: gerarSenha, gerarId: gerarId, local: local,
    publicarGitHub: publicarGitHub, testarGitHub: testarGitHub, temGzip: temGzip };
})();
if (typeof module !== 'undefined') module.exports = Cofre;
