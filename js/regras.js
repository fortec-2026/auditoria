/* Base de regras de classificação fiscal por NCM (SP + federal), revisada em out/2026.
   Cada regra: p = prefixos de NCM (sem pontos), x = prefixos excluídos, d = descrição, l = base legal, n = observação.
   A regra de prefixo mais longo vence. É orientação: o escritório revisa antes de valer para o cliente. */
var Regras = (function () {
  var REVISAO = 'out/2026';
  function R(o) { return o; }

  /* ---------- PIS/COFINS (revenda pelo comércio, Lucro Real ou Presumido) ---------- */
  var PC = [
    // Monofásicos: alíquota zero na revenda
    R({ t: 'mono', p: ['2201', '2202', '2203', '21069010'], x: ['220299'], d: 'Bebidas frias (água, refrigerante, chá pronto, energético, isotônico, cerveja)', l: 'Lei 13.097/2015, arts. 14 e 28', n: 'Bebidas à base de leite, soja ou cacau e néctares de frutas ficam fora. Na revenda, alíquota zero; há quem use CST 06.' }),
    R({ t: 'mono', p: ['220299'], d: 'Outras bebidas não alcoólicas', l: 'Lei 13.097/2015, art. 14', n: 'Monofásico só para energéticos, isotônicos, chás e refrescos prontos. Bebida láctea, de soja ou de cacau e néctar seguem a tributação normal (bebida/composto lácteo tem alíquota zero: Lei 10.925, art. 1º, XI).', cond: true }),
    R({ t: 'mono', p: ['3001', '3003', '3004', '300215', '300610'], d: 'Produtos farmacêuticos', l: 'Lei 10.147/2000, art. 1º, I, "a", e art. 2º', n: 'Confira se o medicamento está na lista positiva, negativa ou neutra.' }),
    R({ t: 'mono', p: ['3303', '3304', '3305', '3307', '340111', '340120', '96032100'], d: 'Perfumaria, toucador e higiene pessoal', l: 'Lei 10.147/2000, art. 1º, I, "b", e art. 2º' }),
    R({ t: 'mono', p: ['271019', '2711'], d: 'Lubrificantes e GLP', l: 'Lei 9.990/2000 e Lei 10.865/2004', cond: true, n: 'Só lubrificantes (2710.19.3) e GLP; outros derivados conferir.' }),
    R({ t: 'mono', p: ['4011', '4013'], d: 'Pneus e câmaras de ar', l: 'Lei 10.485/2002, art. 5º' }),
    // Substituição tributária de PIS/COFINS
    R({ t: 'st', p: ['2402'], d: 'Cigarros', l: 'Lei 9.532/1997, art. 53; Lei 9.715/1998, art. 5º' }),
    // Alíquota zero
    R({ t: 'zero', p: ['0201', '0202', '0203', '0204', '020610', '02062', '020630', '02064', '020680', '0207', '0209', '02101', '021020', '02109900'], d: 'Carnes e miudezas', l: 'Lei 10.925/2004, art. 1º, XIX' }),
    R({ t: 'zero', p: ['0302', '0303', '0304'], x: ['03029'], d: 'Peixes', l: 'Lei 10.925/2004, art. 1º, XX' }),
    R({ t: 'zero', p: ['0401', '04021', '04022', '0403', '190110'], d: 'Leite, leite em pó, leite fermentado e fórmulas infantis', l: 'Lei 10.925/2004, art. 1º, XI', n: 'Leite condensado e creme de leite ficam fora.' }),
    R({ t: 'zero', p: ['0406'], d: 'Queijos', l: 'Lei 10.925/2004, art. 1º, XII', cond: true, n: 'Só mussarela, minas, prato, coalho, ricota, requeijão, provolone, parmesão, fresco não maturado e do reino.' }),
    R({ t: 'zero', p: ['04051000'], d: 'Manteiga', l: 'Lei 10.925/2004, art. 1º, XXIV' }),
    R({ t: 'zero', p: ['15171000'], d: 'Margarina', l: 'Lei 10.925/2004, art. 1º, XXV' }),
    R({ t: 'zero', p: ['0407', '07', '08'], d: 'Ovos, hortícolas e frutas', l: 'Lei 10.865/2004, art. 28, III', n: 'Ovos da posição 04.07 e produtos dos capítulos 7 e 8. Há quem exclua as posições 07.14 e 08.14.' }),
    R({ t: 'zero', p: ['071333', '100620', '100630', '110620'], d: 'Feijão, arroz e farinha de mandioca', l: 'Lei 10.925/2004, art. 1º, V' }),
    R({ t: 'zero', p: ['110220', '110313', '110419'], d: 'Farinha, fubá, sêmola e flocos de milho', l: 'Lei 10.925/2004, art. 1º, IX' }),
    R({ t: 'zero', p: ['11010010'], d: 'Farinha de trigo', l: 'Lei 10.925/2004, art. 1º, XIV' }),
    R({ t: 'zero', p: ['1001'], d: 'Trigo', l: 'Lei 10.925/2004, art. 1º, XV' }),
    R({ t: 'zero', p: ['19012000', '19059090'], d: 'Pré-mistura e pão comum', l: 'Lei 10.925/2004, art. 1º, XVI', cond: true, n: 'Só a pré-mistura para pão comum (Ex 01) e o pão comum (francês ou de sal). Bolos, pães especiais e outros do 1905.90.90 são tributados.' }),
    R({ t: 'zero', p: ['1902'], d: 'Massas alimentícias', l: 'Lei 10.925/2004, art. 1º, XVIII', n: 'Toda a posição 19.02, inclusive macarrão instantâneo e massas recheadas.' }),
    R({ t: 'zero', p: ['0901', '21011'], d: 'Café (inclusive solúvel)', l: 'Lei 10.925/2004, art. 1º, XXI' }),
    R({ t: 'zero', p: ['17011400', '17019900'], d: 'Açúcar', l: 'Lei 10.925/2004, art. 1º, XXII' }),
    R({ t: 'zero', p: ['1507', '1508', '1509', '1510', '1511', '1512', '1513', '1514'], d: 'Óleos vegetais (inclusive azeite)', l: 'Lei 10.925/2004, art. 1º, XXIII' }),
    R({ t: 'zero', p: ['34011190'], d: 'Sabonete', l: 'Lei 10.925/2004, art. 1º, XXVI (também monofásico pela Lei 10.147/2000)', cond: true, n: 'Só o Ex 01 (sabões de toucador).' }),
    R({ t: 'zero', p: ['3306'], d: 'Higiene bucal (creme dental, fio dental, enxaguante)', l: 'Lei 10.925/2004, art. 1º, XXVII (também monofásico pela Lei 10.147/2000)' }),
    R({ t: 'zero', p: ['48181000'], d: 'Papel higiênico', l: 'Lei 10.925/2004, art. 1º, XXVIII' })
  ];

  /* ---------- CBS/IBS (LC 214/2025) ---------- */
  var CBS = [
    R({ r: 100, p: ['10062010', '10062020', '10063011', '10063019', '10063021', '10063029', '10064000', '04011010', '04011090', '04012010', '04012090', '04014010', '04015010', '04021010', '04021090', '04022110', '04022120', '04022910', '04022920', '19011010', '19011090', '04051000', '15171000', '07133319', '07133329', '07133399', '07133590', '0901', '21011', '15132120', '11062000', '19030000', '11022000', '11031300', '11041900', '11042300', '11010010', '17011400', '17019900', '19021100', '19021900', '19012010', '19012090', '19059090', '11041200', '11042200', '11029000', '0201', '0202', '0203', '0204', '0206', '0207', '0209', '0210', '0302', '0303', '0304', '04061010', '04061090', '04062000', '04069010', '04069020', '04069030', '25010020', '25010090', '090300'],
      x: ['020743', '020753'], d: 'Cesta Básica Nacional de Alimentos', l: 'LC 214/2025, art. 125 e Anexo I', ct: '200003', n: 'Carnes e peixes têm exceções (foie gras, salmonídeos, atuns, bacalhau, ovas). Pão francês e queijos só nos tipos listados.' }),
    R({ r: 100, p: ['040721', '040729', '0701', '0702', '0703', '0704', '0705', '0706', '0707', '0708', '0709', '0710', '0714', '08011', '0803', '0804', '0805', '0806', '0807', '0808', '0809', '0810', '0811', '06'], x: ['07095', '07108000'], d: 'Hortícolas, frutas e ovos', l: 'LC 214/2025, art. 148 e Anexo XV', ct: '200014', n: 'Frutas frescas, refrigeradas ou congeladas, sem açúcar. Cogumelos ficam com redução de 60%.' }),
    R({ r: 60, p: ['0306', '0307', '04032000', '04039000', '04090000', '11010020', '11051000', '11052000', '11061000', '11063000', '1208', '11031100', '11031900', '11042900', '11081200', '1507', '1508', '1511', '1512', '1513', '1514', '1515', '19022000', '19023000', '2009', '2008', '19059010', '20029000', '07095', '07108000', '0712', '0713', '0801', '0802', '0813', '10', '12', '20021000', '2004', '2005', '22029900'],
      x: ['030631', '030632', '0306219'], d: 'Alimentos destinados ao consumo humano', l: 'LC 214/2025, art. 135 e Anexo VII', ct: '200034', n: 'Lagostas e lagostins ficam fora. Sucos e polpas só sem açúcar ou conservantes. Itens da Cesta Básica Nacional têm alíquota zero.' }),
    R({ r: 60, p: ['34011190', '33061000', '96032100', '48181000', '38089419', '34011900', '96190000'], d: 'Higiene pessoal e limpeza essenciais', l: 'LC 214/2025, art. 136 e Anexo VIII', ct: '200035' }),
    R({ r: 60, p: ['3003', '3004'], d: 'Medicamentos', l: 'LC 214/2025, arts. 133 e 146 (Anexos VI e XIV)', cond: true, n: 'Redução de 60% ou alíquota zero conforme a lista do medicamento.' })
  ];
  var SELETIVO = ['2203', '2204', '2205', '2206', '2208', '24', '220210'];

  /* ---------- ICMS/SP: tratamento nas saídas internas ---------- */
  var ICMS = [
    R({ t: 'isento', p: ['0701', '0702', '0703', '0704', '0705', '0706', '0707', '0708', '0709', '0714', '0803', '0804', '0805', '0806', '0807', '0809', '0810', '040721', '040729'], x: ['08062', '0709599'], d: 'Hortifrutigranjeiros em estado natural e ovos', l: 'RICMS/SP, Anexo I, art. 36; Lei 16.887/2018', cst: '40', n: 'Vale para o produto em estado natural ou minimamente processado, sem cozimento nem adição de outros produtos. Congelados, secos e industrializados são tributados.' }),
    R({ t: 'isentoCF', p: ['1006'], d: 'Arroz', l: 'RICMS/SP, Anexo I, art. 168 (até 31/12/2026); para revenda, Anexo II, art. 3º, XXII', cst: '40', red: 7 }),
    R({ t: 'isentoCF', p: ['071333', '071335'], d: 'Feijão', l: 'RICMS/SP, Anexo I, art. 169 (até 31/12/2026); para revenda, Anexo II, art. 3º, XXII', cst: '40', red: 7 }),
    R({ t: 'red', red: 7, p: ['0201', '0202', '0203', '0204', '0206', '0207', '0208', '0209', '0210'], d: 'Carnes e produtos comestíveis do abate', l: 'RICMS/SP, Anexo II, art. 3º, I e XIII (cesta básica)' }),
    R({ t: 'red', red: 7, p: ['04011010', '04012010', '04021', '04022'], d: 'Leite longa vida (UHT) e leite em pó', l: 'RICMS/SP, Anexo II, art. 3º, II' }),
    R({ t: 'red', red: 7, p: ['09012'], d: 'Café torrado e moído', l: 'RICMS/SP, Anexo II, art. 3º, III' }),
    R({ t: 'red', red: 7, p: ['1507', '1508', '1510', '1511', '1512', '1513', '1514', '1515'], d: 'Óleos vegetais comestíveis', l: 'RICMS/SP, Anexo II, art. 3º, IV', n: 'Azeite de oliva fica fora.' }),
    R({ t: 'red', red: 7, p: ['170114', '170199'], d: 'Açúcar cristal ou refinado', l: 'RICMS/SP, Anexo II, art. 3º, V' }),
    R({ t: 'red', red: 7, p: ['110220', '110313', '110419', '110423'], d: 'Fubá e farinha de milho', l: 'RICMS/SP, Anexo II, art. 3º, VII' }),
    R({ t: 'red', red: 7, p: ['0302', '0303', '0304'], d: 'Peixes', l: 'RICMS/SP, Anexo II, art. 3º, VIII' }),
    R({ t: 'red', red: 7, p: ['0406', '040510', '151710', '151790'], d: 'Queijos mussarela, prato e minas, manteiga, margarina e creme vegetal', l: 'RICMS/SP, Anexo II, art. 3º, IX', cond: true, n: 'Outros queijos são tributados a 18%.' }),
    R({ t: 'red', red: 7, p: ['0808'], d: 'Maçãs e peras', l: 'RICMS/SP, Anexo II, art. 3º, XI' }),
    R({ t: 'red', red: 7, p: ['190590'], d: 'Pão francês, de forma e bisnaga', l: 'RICMS/SP, Anexo II, art. 3º, XIV e XXI', cond: true, n: 'Bolos e outros produtos de padaria do mesmo NCM: 18%.' }),
    R({ t: 'red', red: 7, p: ['1001', '110100', '190120', '190211', '190219'], d: 'Trigo, farinha de trigo, pré-misturas e massas não cozidas', l: 'RICMS/SP, Anexo II, art. 3º, XVI a XX', n: 'Na compra interestadual, o crédito fica limitado a 7%.' }),
    R({ t: 'red', red: 7, p: ['110620', '2501', '021020', '1601', '160413', '2209'], d: 'Farinha de mandioca, sal, charque, embutidos (linguiça, salsicha, mortadela), sardinha em lata e vinagre', l: 'RICMS/SP, Anexo II, art. 3º, XXII e XXIII' }),
    R({ t: 'aliq', a: 12, p: ['330610', '96032100'], d: 'Creme dental e escova de dente', l: 'RICMS/SP, art. 54, XVIII' }),
    R({ t: 'aliq', a: 20, fecoep: 2, p: ['2203'], d: 'Cerveja e chope', l: 'RICMS/SP, art. 54-A; adicional de 2% (FECOEP), art. 56-C' }),
    R({ t: 'aliq', a: 25, p: ['2204', '2205', '2208'], d: 'Vinhos e destilados', l: 'RICMS/SP, art. 55, II' }),
    R({ t: 'aliq', a: 25, p: ['3303', '3304', '3305', '3307'], d: 'Perfumes e cosméticos', l: 'RICMS/SP, art. 55, IV', cond: true, n: 'Protetores solares e alguns itens específicos ficam a 18%.' }),
    R({ t: 'aliq', a: 30, fecoep: 2, p: ['24'], d: 'Fumo e cigarros', l: 'RICMS/SP, art. 55-A; adicional de 2% (FECOEP), art. 56-C' })
  ];

  /* ---------- ICMS-ST em SP (situação em out/2026) ---------- */
  var ST = [
    R({ st: 'sim', p: ['2202', '2203', '21069010'], d: 'Cerveja, chope, refrigerante, energético e outras bebidas', l: 'Portaria CAT 68/2019, Anexo III', n: 'As águas saíram da ST em 01/07/2026 (Portaria SRE 9/2026).' }),
    R({ st: 'sim', p: ['2402', '2403'], d: 'Cigarros e fumo', l: 'Portaria CAT 68/2019' }),
    R({ st: 'nao', p: ['2201'], desde: '01/07/2026', d: 'Água mineral e potável', l: 'Portaria SRE 9/2026' }),
    R({ st: 'nao', p: ['2204', '2205', '2206', '2207', '2208'], desde: '01/01/2026', d: 'Bebidas alcoólicas, exceto cerveja e chope', l: 'Portaria SRE 64/2025' }),
    R({ st: 'nao', p: ['2105'], desde: '01/07/2026', d: 'Sorvetes', l: 'Portaria SRE 9/2026' }),
    R({ st: 'nao', p: ['3303', '3304', '3305', '3306', '3307', '3401', '96032', '9619', '4818'], desde: '01/04/2026', d: 'Higiene pessoal e perfumaria', l: 'Portaria SRE 9/2026' }),
    R({ st: 'nao', p: ['3402', '3405', '3808', '2828', '3809', '3824'], desde: '01/08/2026', d: 'Produtos de limpeza', l: 'Portaria SRE 20/2026' }),
    R({ st: 'nao', p: ['2309'], desde: '01/08/2026', d: 'Rações para animais domésticos', l: 'Portaria SRE 20/2026' }),
    R({ st: 'nao', p: ['3003', '3004'], desde: '01/01/2026', d: 'Medicamentos', l: 'Portaria SRE 64/2025' }),
    R({ st: 'nao', p: ['8539'], desde: '01/01/2026', d: 'Lâmpadas', l: 'Portaria SRE 82/2025' }),
    R({ st: 'nao', p: ['4011', '4013', '8708', '8507', '3208', '3209', '3210', '8205', '8536', '8544'], desde: '01/10/2026', d: 'Autopeças, pneus, baterias, tintas, ferramentas e materiais elétricos', l: 'Portaria SRE 34/2026' }),
    R({ st: 'cest', p: ['1704', '1806', '1901', '1904', '1905', '2103', '2104', '2106', '0402', '1602', '2007', '2008', '2001', '2005'], d: 'Produtos alimentícios', l: 'Portaria CAT 68/2019 (alimentícios) e Portaria SRE 74/2025', n: 'Parte dos alimentícios saiu da ST em 01/01/2026. Depende do CEST do produto.' })
  ];
  // CESTs de alimentícios que saíram da ST em 01/01/2026 (Portaria SRE 74/2025)
  var CEST_ALIM_FORA = ['0701000', '1701100', '1703000', '1703100', '1703101', '1703200', '1703300', '1704200', '1704300', '1706500', '1706600', '1706700', '1706800', '1706900', '1706901', '1707000', '1707100', '1707200', '1707300', '1707400', '1708800', '1708900', '1709000', '1709100', '1709200', '1709300', '1709400', '1709500', '1709600', '1709604', '1709605', '1709700', '1709800', '1709900', '1710100', '1710300', '1710600', '1710700', '1710701', '1710800', '1710801', '1710900', '1711000', '1711100', '1711200', '1711300', '1711400', '1711500'];

  function so(n) { return String(n || '').replace(/\D/g, ''); }
  function acha(lista, ncm) {
    var melhor = null, tam = -1;
    lista.forEach(function (r) {
      if ((r.x || []).some(function (x) { return ncm.indexOf(x) === 0; })) return;
      r.p.forEach(function (p) { if (ncm.indexOf(p) === 0 && p.length > tam) { melhor = r; tam = p.length; } });
    });
    return melhor;
  }
  var INTER7 = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'PA', 'PB', 'PE', 'PI', 'RN', 'RO', 'RR', 'SE', 'TO'];
  var CST_PC = { normal: '01', mono: '04', st: '05', zero: '06' };

  /* o = { ncm, cest, destino: 'cf'|'revenda', uf: 'SP'|UF, contribuinte: bool, regime: 'real'|'presumido'|'simples', importado: bool, mono: fn(ncm)->bool (lista da empresa) } */
  function classificar(o) {
    var ncm = so(o.ncm), cest = so(o.cest), regime = o.regime || 'real', simples = regime === 'simples';
    var interna = !o.uf || o.uf === 'SP', cf = o.destino === 'cf';
    var res = { ncm: ncm, revisao: REVISAO, alertas: [] };
    if (ncm.length !== 8) { res.erro = 'Informe o NCM com 8 dígitos.'; return res; }

    /* PIS/COFINS */
    var rpc = acha(PC, ncm);
    if (o.mono && o.mono(ncm) && (!rpc || rpc.t !== 'zero')) rpc = { t: 'mono', d: 'Monofásico pela lista da empresa', l: 'Lei 10.485/2002 (lista de monofásicos da empresa)' };
    var tpc = rpc ? rpc.t : 'normal';
    var pc = { trat: tpc, cst: CST_PC[tpc], regra: rpc, cond: !!(rpc && rpc.cond) };
    if (simples) {
      pc.titulo = tpc === 'mono' ? 'Monofásico: segregar no PGDAS-D' : tpc === 'st' ? 'Substituição tributária: segregar no PGDAS-D' : 'Tributado no DAS';
      pc.texto = tpc === 'mono' || tpc === 'st' ? 'Informe a receita como tributação concentrada (monofásica) ou ST no PGDAS-D; o PIS e a COFINS saem da guia.' : tpc === 'zero' ? 'No Simples Nacional a alíquota zero da cesta básica não reduz o DAS: a receita é tributada normalmente.' : 'Receita tributada normalmente no DAS.';
      pc.cst = tpc === 'mono' ? '04' : tpc === 'st' ? '05' : '49';
    } else {
      var aliq = regime === 'presumido' ? '0,65% e 3%' : '1,65% e 7,6%';
      pc.titulo = { mono: 'Monofásico: alíquota zero na revenda', st: 'Substituição tributária: sem débito na revenda', zero: 'Alíquota zero', normal: 'Tributado (' + aliq + ')' }[tpc];
      pc.texto = tpc === 'normal' ? 'PIS ' + aliq.split(' e ')[0] + ' e COFINS ' + aliq.split(' e ')[1] + ' sobre a receita, sem o ICMS na base (Tema 69).' + (regime === 'real' ? ' Na compra para revenda gera crédito.' : '') :
        tpc === 'zero' ? 'Sem PIS e COFINS na venda.' + (regime === 'real' ? ' A compra também não gera crédito.' : '') :
        'Sem PIS e COFINS na revenda; a compra não gera crédito.';
    }

    /* ICMS */
    var ri = acha(ICMS, ncm), rst = acha(ST, ncm), icms = { regra: ri, cond: !!(ri && ri.cond) };
    var st = { regra: rst, st: rst ? rst.st : 'nao' };
    if (st.st === 'cest') {
      if (/^17/.test(cest)) st.st = CEST_ALIM_FORA.indexOf(cest) >= 0 ? 'nao' : 'sim';
      else if (cest) st.st = 'nao';
    }
    if (/^10/.test(cest) && st.st === 'nao' && !rst) { st.st = 'sim'; st.regra = { d: 'Materiais de construção', l: 'Portaria CAT 68/2019, Anexo XVII', n: 'Segmento que segue na ST em SP; confira o CEST.' }; }
    if (interna) {
      if (st.st === 'sim') {
        icms.titulo = 'Substituição tributária: ICMS já recolhido na compra';
        icms.cst = simples ? '500' : '60';
        icms.texto = 'Na venda, sem destaque de ICMS (CFOP 5.405). Alíquota usada pelo fornecedor no cálculo da ST: ' + (ri && ri.t === 'aliq' ? ri.a + '%' + (ri.fecoep ? ' + 2% FECOEP' : '') : '18%') + '.';
      } else if (ri && (ri.t === 'isento' || (ri.t === 'isentoCF' && cf))) {
        icms.titulo = 'Isento'; icms.cst = simples ? '103' : '40';
        icms.texto = ri.t === 'isentoCF' ? 'Isento na venda a consumidor final em SP. O crédito da compra pode ser mantido até 7%.' : 'Isento nas saídas internas.';
      } else if (ri && (ri.t === 'red' || ri.t === 'isentoCF')) {
        icms.titulo = 'Base reduzida: carga de 7%'; icms.cst = simples ? '102' : '20'; icms.carga = 7;
        icms.texto = 'Redução da base de cálculo para que a carga fique em 7% (cesta básica, Convênio ICMS 128/94), válida até 31/12/2026.' + (ri.t === 'isentoCF' ? ' Para consumidor final o produto é isento.' : '');
      } else {
        var a = ri && ri.t === 'aliq' ? ri.a : 18;
        icms.titulo = 'Tributado a ' + a + '%' + (ri && ri.fecoep && cf ? ' + 2% FECOEP' : ''); icms.cst = simples ? '102' : '00'; icms.carga = a;
        icms.texto = 'Alíquota interna de ' + a + '%' + (ri && ri.fecoep ? '; na venda a consumidor final soma o adicional de 2% do FECOEP' : '') + '.' + (st.regra && st.st === 'nao' && st.regra.desde ? ' Produto fora da ST desde ' + st.regra.desde + ': a venda destaca o ICMS próprio e a compra gera crédito.' : '');
      }
    } else {
      var inter = o.importado ? 4 : (INTER7.indexOf(o.uf) >= 0 ? 7 : 12);
      icms.titulo = 'Interestadual: ' + inter + '%'; icms.cst = simples ? '102' : '00'; icms.carga = inter;
      icms.texto = (o.contribuinte ? 'Venda a contribuinte de ' + o.uf + ': alíquota interestadual de ' + inter + '%.' : 'Venda a não contribuinte de ' + o.uf + ': destaca ' + inter + '% e recolhe o DIFAL (alíquota interna de ' + o.uf + ' menos ' + inter + '%) para o estado de destino.') +
        ' Isenções e reduções de SP não se aplicam fora do estado.' + (st.st === 'sim' ? ' Confira se há protocolo de ST entre SP e ' + o.uf + ' para este produto.' : '');
    }
    if (simples) icms.texto += ' No Simples Nacional, use o CSOSN; a receita com ST é segregada no PGDAS-D.';

    /* IPI */
    var ipi = { titulo: 'Não incide na revenda', texto: 'O comércio varejista e atacadista não é contribuinte do IPI (não equiparado a industrial). O IPI pago na compra entra no custo' + (regime === 'real' ? ' e na base do crédito de PIS/COFINS.' : '.') };

    /* CBS/IBS */
    var rc = acha(CBS, ncm), red = rc ? rc.r : 0;
    var cbs = { regra: rc, reducao: red, cond: !!(rc && rc.cond) };
    cbs.titulo = red === 100 ? 'Alíquota zero' : red === 60 ? 'Redução de 60%' : 'Alíquota padrão';
    cbs.cst = red === 100 ? '200' : red === 60 ? '200' : '000';
    cbs.cClassTrib = rc ? rc.ct || '' : '000001';
    var f = (100 - red) / 100;
    cbs.texto = 'Em 2026 (ano de teste): CBS ' + fmt(0.9 * f) + '% e IBS ' + fmt(0.1 * f) + '%, só destacados na nota. A partir de 2027 a CBS passa a ser cobrada' + (red ? ' com o mesmo benefício' : '') + '.';
    if (SELETIVO.some(function (p) { return ncm.indexOf(p) === 0; })) cbs.texto += ' Sujeito também ao Imposto Seletivo a partir de 2027.';

    res.pc = pc; res.icms = icms; res.st = st; res.ipi = ipi; res.cbs = cbs;
    return res;
  }
  function fmt(v) { return (Math.round(v * 100) / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 }); }

  return { classificar: classificar, REVISAO: REVISAO, CST_PC: CST_PC };
})();
