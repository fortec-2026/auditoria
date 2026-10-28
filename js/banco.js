/* ===== Banco: acesso ao Supabase (login, empresas, notas, produtos, acessos) =====
   A chave abaixo é a chave pública do projeto: ela pode ficar no site, porque
   quem protege os dados são as regras de acesso (RLS) do banco. */
var Banco = (function () {
  'use strict';
  var URL_SB = 'https://ekhtiductqttqgpyetlk.supabase.co';
  var CHAVE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVraHRpZHVjdHF0dHFncHlldGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NzY5MTksImV4cCI6MjEwNzA1MjkxOX0.tiTZqNOGEv8jZGo7hjbvGswe_wEzG4Cx6skp3SVSFEk';
  var sb = window.supabase.createClient(URL_SB, CHAVE, { auth: { persistSession: true, storageKey: 'portal-fiscal-auth' } });

  function ok(r) { if (r.error) throw r.error; return r.data; }
  function urlSite() { return location.origin + location.pathname; }

  /* ---------- login ---------- */
  async function sessao() { return ok(await sb.auth.getSession()).session; }
  async function entrar(email, senha) { return ok(await sb.auth.signInWithPassword({ email: email, password: senha })); }
  async function criarConta(email, senha) { return ok(await sb.auth.signUp({ email: email, password: senha, options: { emailRedirectTo: urlSite() } })); }
  async function sair() { await sb.auth.signOut(); }
  async function esqueciSenha(email) { return ok(await sb.auth.resetPasswordForEmail(email, { redirectTo: urlSite() })); }
  async function novaSenha(senha) { return ok(await sb.auth.updateUser({ password: senha })); }
  function aoMudarSessao(fn) { sb.auth.onAuthStateChange(fn); }
  async function perfil() {
    var s = await sessao(); if (!s) return null;
    var p = ok(await sb.from('perfis').select('papel,email').eq('user_id', s.user.id).maybeSingle());
    return { id: s.user.id, email: s.user.email, papel: (p && p.papel) || 'cliente' };
  }

  /* ---------- empresas ---------- */
  async function empresas() { return ok(await sb.from('empresas').select('*').order('razao_social')); }
  async function contarNotas(cnpj) {
    var t = await sb.from('notas').select('chave', { count: 'exact', head: true }).eq('empresa_cnpj', cnpj);
    var p = await sb.from('notas').select('chave', { count: 'exact', head: true }).eq('empresa_cnpj', cnpj).eq('publicada', false);
    return { total: t.count || 0, pendentes: p.count || 0 };
  }
  async function garantirEmpresa(cnpj, nome) {
    var e = ok(await sb.from('empresas').select('*').eq('cnpj', cnpj).maybeSingle());
    if (e) return e;
    return ok(await sb.from('empresas').insert({ cnpj: cnpj, razao_social: nome || '', ncm_monofasico: Fiscal.DEFAULT_MONO, ncm_st: Fiscal.DEFAULT_ST }).select().single());
  }
  async function salvarEmpresa(cnpj, campos) { return ok(await sb.from('empresas').update(campos).eq('cnpj', cnpj).select().single()); }
  async function apagarEmpresa(cnpj) { return ok(await sb.from('empresas').delete().eq('cnpj', cnpj)); }

  /* ---------- dados de uma empresa ---------- */
  async function todos(consulta) {
    var out = [], de = 0, PAG = 1000;
    for (;;) {
      var r = ok(await consulta().range(de, de + PAG - 1));
      out = out.concat(r); if (r.length < PAG) break; de += PAG;
    }
    return out;
  }
  async function carregar(cnpj, comHistorico) {
    var r = await Promise.all([
      todos(function () { return sb.from('notas').select('chave,publicada,dados').eq('empresa_cnpj', cnpj).order('chave'); }),
      todos(function () { return sb.from('cancelamentos').select('chave').eq('empresa_cnpj', cnpj).order('chave'); }),
      todos(function () { return sb.from('produtos').select('chave_produto,ncm,descricao,classe,atualizado_em').eq('empresa_cnpj', cnpj).order('chave_produto'); }),
      todos(function () { return sb.from('ncm_regras').select('ncm_prefixo,classe,atualizado_em').eq('empresa_cnpj', cnpj).order('ncm_prefixo'); }),
      comHistorico ? ok(await sb.from('classificacao_historico').select('*').eq('empresa_cnpj', cnpj).order('alterado_em', { ascending: false }).limit(300)) : [],
      todos(function () { return sb.from('acompanhamento').select('chave,status,texto,atualizado_em').eq('empresa_cnpj', cnpj).order('chave'); })
    ]);
    return { notas: r[0], canc: r[1], produtos: r[2], ncm: r[3], hist: r[4], acomp: r[5] };
  }
  async function salvarNotas(cnpj, notas, aoProgresso) {
    var LOTE = 250;
    for (var i = 0; i < notas.length; i += LOTE) {
      var linhas = notas.slice(i, i + LOTE).map(function (n) {
        return { chave: n.ch, empresa_cnpj: cnpj, data_emissao: n.dt, modelo: n.mod || '55', publicada: false, dados: n };
      });
      ok(await sb.from('notas').upsert(linhas, { onConflict: 'chave' }));
      if (aoProgresso) aoProgresso(Math.min(i + LOTE, notas.length), notas.length);
    }
  }
  async function salvarCancelamentos(cnpj, chaves) {
    if (!chaves.length) return;
    ok(await sb.from('cancelamentos').upsert(chaves.map(function (c) { return { chave: c, empresa_cnpj: cnpj }; }), { onConflict: 'chave' }));
  }
  async function publicar(cnpj) { return ok(await sb.rpc('publicar_empresa', { p_cnpj: cnpj })); }

  /* ---------- classificação de produtos ---------- */
  async function classificarProduto(cnpj, chave, ncm, descricao, classe) {
    return ok(await sb.from('produtos').upsert({ empresa_cnpj: cnpj, chave_produto: chave, ncm: ncm || '', descricao: descricao || '', classe: classe }, { onConflict: 'empresa_cnpj,chave_produto' }));
  }
  async function removerProduto(cnpj, chave) { return ok(await sb.from('produtos').delete().eq('empresa_cnpj', cnpj).eq('chave_produto', chave)); }
  async function classificarNcm(cnpj, ncm, classe) {
    ok(await sb.from('ncm_regras').upsert({ empresa_cnpj: cnpj, ncm_prefixo: ncm, classe: classe }, { onConflict: 'empresa_cnpj,ncm_prefixo' }));
    ok(await sb.from('produtos').delete().eq('empresa_cnpj', cnpj).eq('ncm', ncm));
  }
  async function removerNcm(cnpj, ncm) { return ok(await sb.from('ncm_regras').delete().eq('empresa_cnpj', cnpj).eq('ncm_prefixo', ncm)); }

  /* ---------- acessos dos clientes ---------- */
  async function acessos(cnpj) { return ok(await sb.rpc('clientes_da_empresa', { p_cnpj: cnpj })); }
  // a conta é criada no servidor (função criar-acesso), que confere se quem pede é do escritório
  async function criarAcesso(cnpj, email, senha) {
    var r = await sb.functions.invoke('criar-acesso', { body: { email: email, senha: senha, cnpj: cnpj } });
    if (r.error) {
      var msg = r.error.message;
      try { var j = await r.error.context.json(); if (j && j.erro) msg = j.erro; } catch (e) {}
      throw new Error(msg);
    }
    return r.data;
  }
  /* ---------- acompanhamento das notas ---------- */
  async function salvarAcompanhamento(cnpj, chave, status, texto) {
    return ok(await sb.from('acompanhamento').upsert({ empresa_cnpj: cnpj, chave: chave, status: status, texto: texto || '' }, { onConflict: 'empresa_cnpj,chave' }));
  }
  async function removerAcompanhamento(cnpj, chave) { return ok(await sb.from('acompanhamento').delete().eq('empresa_cnpj', cnpj).eq('chave', chave)); }

  /* ---------- equipe do escritório ---------- */
  async function equipe() { return ok(await sb.rpc('equipe_escritorio')); }
  async function adicionarEquipe(email, senha) {
    var r = await sb.functions.invoke('criar-acesso', { body: { email: email, senha: senha, papel: 'escritorio' } });
    if (r.error) {
      var msg = r.error.message;
      try { var j = await r.error.context.json(); if (j && j.erro) msg = j.erro; } catch (e) {}
      throw new Error(msg);
    }
    return r.data;
  }
  async function removerEquipe(userId) { return ok(await sb.rpc('remover_da_equipe', { p_user: userId })); }

  async function removerAcesso(cnpj, userId) { return ok(await sb.from('empresa_usuarios').delete().eq('empresa_cnpj', cnpj).eq('user_id', userId)); }

  return { sessao: sessao, entrar: entrar, criarConta: criarConta, sair: sair, esqueciSenha: esqueciSenha, novaSenha: novaSenha, aoMudarSessao: aoMudarSessao, perfil: perfil,
    empresas: empresas, contarNotas: contarNotas, garantirEmpresa: garantirEmpresa, salvarEmpresa: salvarEmpresa, apagarEmpresa: apagarEmpresa,
    carregar: carregar, salvarNotas: salvarNotas, salvarCancelamentos: salvarCancelamentos, publicar: publicar,
    classificarProduto: classificarProduto, removerProduto: removerProduto, classificarNcm: classificarNcm, removerNcm: removerNcm,
    acessos: acessos, criarAcesso: criarAcesso, removerAcesso: removerAcesso,
    equipe: equipe, adicionarEquipe: adicionarEquipe, removerEquipe: removerEquipe,
    salvarAcompanhamento: salvarAcompanhamento, removerAcompanhamento: removerAcompanhamento };
})();
