# RG Fiscal · Portal do cliente

Portal da **RG Fiscal (Reis & Godói Consultoria Tributária)**. Apuração de ICMS, PIS e COFINS e auditoria de notas fiscais (NF-e e NFC-e) para empresas de pneus e autopeças em SP, no Lucro Real.

O site fica no GitHub Pages e os dados ficam no Supabase, no projeto **Orçamentos** (`ekhtiductqttqgpyetlk`). Cada pessoa entra com e-mail e senha.

## Excluir notas de um período

Na área do escritório, **Excluir notas de um período** apaga do banco as notas de um mês (ou de um intervalo de datas), junto com os XMLs e as anotações delas. Serve para tirar, por exemplo, notas de setembro de um cliente que começa em outubro. Pede confirmação, mostra quantas notas serão apagadas e não pode ser desfeito (para voltar, importe os XMLs de novo). A exclusão é feita pela função `excluir_periodo` do banco, que só funciona para a equipe do escritório.

## Passo a passo para o cliente

Quando o cliente (ou quem abre o link de demonstração) entra no painel, aparece um passo a passo de 11 telas explicando o resumo, os períodos, os cards de impostos, as pendências, as notas, a classificação dos produtos e o Excel. Dá para pular, voltar e marcar "Não mostrar ao entrar" (fica salvo no navegador). O ícone de interrogação no topo abre o passo a passo de novo. O escritório não vê o passo a passo automaticamente, só pelo ícone.

## Link de demonstração

O endereço do site com `#demo` no final (por exemplo `https://fortec-2026.github.io/auditoria/#demo`) abre a empresa de exemplo, com notas fictícias, na visão do cliente e sem login. A faixa da demonstração traz botões de WhatsApp para falar com Cassiano e Vinicius. Na tela de empresas, o botão **Copiar link de demonstração** copia esse endereço.

## Quem faz o quê

| Papel | O que vê e faz |
|---|---|
| Escritório | Todas as empresas. Importa XMLs, classifica produtos, ajusta monofásicos, publica e libera o acesso dos clientes. |
| Cliente | Só as empresas liberadas para o e-mail dele, e só as notas publicadas. Somente leitura. |

As regras de acesso ficam no próprio banco (RLS). Mesmo quem tentar acessar o banco direto pela chave pública não consegue ler nem alterar o que não é seu.

## Fluxo do escritório

1. Entre no site com a conta do escritório.
2. Clique em **Importar XMLs de nova empresa** e envie o .zip com as notas emitidas e recebidas e os eventos de cancelamento. O CNPJ é detectado pelas notas.
3. Revise a aba **Produtos** e classifique o que é uso e consumo ou ativo. O histórico de cada mudança é gravado automaticamente.
4. Clique em **Publicar para o cliente**. Até a publicação, o cliente não vê as notas novas.
5. Em **Escritório › Acessos do cliente**, informe o e-mail e uma senha inicial do cliente e clique em **Liberar acesso**. Envie a senha por um canal diferente do e-mail.

## Primeiro acesso do escritório

O cadastro público fica desligado por segurança: só o escritório cria contas.

1. No painel do Supabase, abra **Authentication › Users › Add user › Create new user**, informe o e-mail e a senha do escritório e marque **Auto Confirm User**.
2. Promova a conta a escritório: no **SQL Editor** do projeto, rode o comando abaixo, trocando o e-mail.

```sql
update public.perfis set papel = 'escritorio' where email = 'seu-email@escritorio.com.br';
```

Depois da primeira conta, a equipe do escritório (sócios e colaboradores) é cadastrada no próprio portal, na tela **Empresas › Equipe do escritório**. A mesma tela permite remover alguém da equipe.

As contas dos clientes são criadas pelo próprio portal, em **Escritório › Acessos do cliente**, pela função `criar-acesso` do Supabase. A função confere se quem pede é do escritório antes de criar.

## Configuração do Supabase (Authentication › URL Configuration)

Em **Redirect URLs**, adicione o endereço do site, por exemplo `https://fortec-2026.github.io/auditoria/`. Sem isso, os links de confirmação de e-mail e de nova senha não voltam para o portal.

## Banco de dados

| Tabela | Conteúdo |
|---|---|
| `empresas` | Clientes do escritório. Guarda a data de corte da ST e a lista de NCM monofásicos de cada um. |
| `notas` | Uma linha por chave de acesso, com a nota lida do XML e a marca de publicada. |
| `cancelamentos` | Chaves de notas canceladas. |
| `produtos` e `ncm_regras` | Classificação de produtos: revenda, insumo de serviço, uso e consumo ou ativo. |
| `classificacao_historico` | Quem mudou cada classificação, quando, e de qual classe para qual. |
| `empresa_usuarios` | Quais e-mails veem quais empresas. |
| `perfis` | Papel de cada usuário: escritório ou cliente. |
| `publicacoes` | Registro de cada publicação. |
| `notas_xml` | XML original de cada documento, compactado. O cliente só lê o das notas publicadas. |

A estrutura do banco está registrada nas migrations do projeto no Supabase (`portal_fiscal_estrutura` e `portal_fiscal_permissoes_funcoes`).

## Documentos aceitos

| Documento | Como entra na apuração |
|---|---|
| NF-e e NFC-e | ICMS, PIS/COFINS e auditoria por item. |
| CT-e | Crédito de ICMS e de PIS/COFINS só quando a empresa é a tomadora do frete. No frete de compra de produtos monofásicos, não há crédito de PIS/COFINS. Quando quem paga é outro (por exemplo, o Mercado Livre), o CT-e é só informativo. A auditoria confere a alíquota interestadual (7% ou 12%), os 12% do frete interno em SP e o cálculo base × alíquota. |
| NFS-e prestada (padrão nacional) | Débito de PIS/COFINS, ISS a recolher e retido, e retenções federais sofridas. A auditoria confere alíquota de ISS fora de 2% a 5%, o cálculo do ISS, o CST e os valores de PIS/COFINS. |
| NFS-e tomada (padrão nacional) | Crédito de PIS/COFINS só para o serviço classificado como insumo da prestação de serviço. Mostra o ISS e as retenções federais que a empresa reteve e deve recolher. |

Eventos de cancelamento de NF-e, CT-e e NFS-e retiram o documento da apuração.

## Segmento e regime da empresa

Na área do escritório, cada empresa tem um **segmento** e um **regime tributário** (colunas `segmento` e `regime` da tabela `empresas`). Empresas novas entram como pneus e autopeças, no Lucro Real.

| Segmento | PIS/COFINS na apuração | Auditoria de ICMS das vendas |
|---|---|---|
| Pneus e autopeças | Lista de monofásicos da empresa (Lei 10.485/2002) | Saída da ST em 01/10/2026 (lista de NCM e data de corte) |
| Varejo de alimentos e Outros | Regras da Classificação fiscal (monofásico, alíquota zero, ST) mais a lista da empresa | Cada produto vendido em SP é comparado com o ICMS esperado (ST, isento, carga de 7%, alíquota); divergências viram a pendência "ICMS do cadastro do produto" |

No varejo, produtos comprados entram como revenda e compras com ST (CST 10, 60 ou 70) não geram crédito de ICMS.

| Regime | Efeito |
|---|---|
| Lucro Real | PIS 1,65% e COFINS 7,6% não cumulativos, com créditos. |
| Lucro Presumido | PIS 0,65% e COFINS 3% cumulativos, sem créditos. |
| Simples Nacional | Sem débito e crédito. O painel mostra a receita separada para o PGDAS-D (ICMS-ST, PIS/COFINS monofásico ou ST, alíquota zero) e alerta produto monofásico vendido sem CST 04. |

## Classificação fiscal

A aba **Classificação fiscal** mostra, por NCM, o tratamento de PIS/COFINS, ICMS, ICMS-ST, IPI e CBS/IBS na revenda pelo comércio em SP, com a base legal de cada um. As regras ficam em `js/regras.js` e foram revisadas em out/2026:

- **PIS/COFINS:** monofásicos (Lei 13.097/2015, bebidas frias; Lei 10.147/2000, farmacêuticos e higiene; Lei 10.485/2002, autopeças e pneus, pela lista da empresa), ST de cigarros e alíquota zero (Lei 10.925/2004, art. 1º; Lei 10.865/2004, art. 28).
- **ICMS/SP:** isenções (hortifrutigranjeiros, ovos, arroz e feijão para consumidor final), cesta básica com carga de 7% (Anexo II, art. 3º), alíquotas de 12%, 20%, 25% e 30% e o adicional do FECOEP.
- **ICMS-ST em SP:** segmentos que continuam na ST (bebidas do Anexo III, cigarros, parte dos alimentícios conforme o CEST) e os que saíram em 2026. Materiais de construção (Anexo XVII), margarinas e cremes vegetais (Anexo XVI, itens 25 a 27) e tomates preparados (item 39) seguem na ST até 31/01/2027 e saem em 01/02/2027 (Portaria SRE 52/2026; estoque pela Portaria CAT 28/2020).
- **CBS/IBS:** Cesta Básica Nacional (Anexo I), hortícolas, frutas e ovos (Anexo XV), alimentos com redução de 60% (Anexo VII) e higiene e limpeza (Anexo VIII) da LC 214/2025.

A aba tem uma consulta por NCM (com destino, tipo de comprador e regime) e a lista dos produtos vendidos e comprados no período. Nos vendidos, compara o CST e a carga de ICMS que saíram nas notas com o esperado e marca **Divergente**, **Conferir** (o benefício depende da descrição do produto) ou **Confere**. O regime escolhido fica salvo por empresa no navegador. O Excel traz a aba "Classificação fiscal".

As regras são orientação e devem ser revisadas pelo escritório, principalmente as datas de vigência (benefícios de SP até 31/12/2026) e as listas de ST, que mudam com frequência.

## Semanas

As semanas vão de segunda a domingo, mas são cortadas na virada do mês: a semana de 28/09 a 04/10 vira "Semana 5 de setembro" (28/09 a 30/09) e "Semana 1 de outubro" (01/10 a 04/10). Assim a soma das semanas de um mês é sempre igual ao total do mês.

## Antes × depois

A tabela da aba Apuração tem a mesma escolha: **Como emitidas** ou **Após as correções**. O Excel segue a visão escolhida (o título das abas de apuração diz qual). No Simples Nacional a escolha não aparece.

No topo do painel há duas linhas de cards: **Como as notas foram emitidas** (ICMS, PIS e COFINS com os valores das notas, inclusive os errados) e, logo abaixo, **Após corrigir as pendências**, com o card **Impacto das correções** (diferença em cada tributo). Os botões "Só os erros" e "Erros e alertas" valem para os cards e para a aba.

A aba **Antes × depois** compara duas apurações do período: como as notas foram emitidas e como fica depois de corrigir as pendências. Dá para corrigir só os erros ou erros e alertas. Pendências "Conferida, sem ação" ficam como estão. Uma tabela mostra quanto cada tipo de ocorrência muda o ICMS, o PIS e a COFINS. Pendências que não mudam valores (CFOP, classificação, ST retida pelo fornecedor, duplicidade) são contadas à parte. O Excel traz a mesma comparação na aba "Antes x depois".

## Excel e impressão

No painel, ao lado de Semanas/Meses, ficam os botões **Baixar Excel** e **Imprimir**. Os dois respeitam o período selecionado.

- **Excel:** um arquivo .xlsx com as abas Resumo, Apuração por mês, por semana e por dia, Notas, Itens das notas, Pendências (com situação e anotação), Produtos, Serviços tomados e Fretes. Valores e datas saem como números, com filtro e cabeçalho fixo.
- **Imprimir:** imprime a visão geral e a aba aberta, sem limite de linhas. Para salvar em PDF, escolha "Salvar como PDF" na janela de impressão.

## Ver a nota

Clique no número de uma nota (abas Notas, Pendências e Serviços/fretes) para abrir o espelho do documento: emitente, destinatário, itens com NCM, CFOP, CST e tributos, itens com problema destacados, totais, transporte, cobrança e informações complementares. A tela também permite baixar o XML original e imprimir.

O XML original é guardado a cada importação. Notas importadas antes dessa função abrem só com os dados apurados; para completar, reimporte o arquivo. Reimportar não tira do ar as notas já publicadas.

## Acompanhamento das notas

Cada nota pode receber uma **situação** e uma **anotação**, nas abas Notas e Pendências. O cliente vê as duas, mas só o escritório altera.

| Situação | Uso |
|---|---|
| Em aberto | Pendência ainda sem ação. |
| Emitente avisado | O fornecedor ou o cliente já foi contatado. |
| Corrigida | Veio CC-e ou nota substituta. |
| Conferida, sem ação | Revisada e aceita como está. |

As situações "Corrigida" e "Conferida, sem ação" tiram a nota das contagens de erros e alertas. Toda alteração fica gravada no histórico (`acompanhamento_historico`). Notas sem pendência aparecem como **Correta**, com um resumo do tratamento: crédito de ICMS, monofásico, ST anterior ao corte etc.

## Regras fiscais aplicadas

- **ICMS/SP:** pneus e autopeças com tributação normal a partir de 01/10/2026 (Portaria SRE 34/2026).
  - Alíquota interna de 18%. Na interestadual, 12% ou 7%, e 4% para mercadoria importada.
  - Entradas com ST antes do corte não geram crédito. Uso e consumo não gera crédito. Ativo segue o CIAP.
- **PIS/COFINS não cumulativo:** 1,65% e 7,6%. O ICMS fica fora da base do débito (Tema 69/STF) e da base do crédito (Lei 14.592/2023).
- **Duas listas de NCM por empresa** (Escritório › Listas de NCM):
  - **Monofásicos de PIS/COFINS (Lei 10.485/2002):** só afeta o PIS/COFINS. Sem débito na revenda e sem crédito na compra.
    - A lista padrão segue o texto vigente da lei: pneus e câmaras (art. 5º), todos os códigos do Anexo I e os 15 itens do Anexo II.
    - Os itens do Anexo II (4009, 8431, 8408.90.90, 8412.21.10, 8412.21.90, 8412.31.10, 8413.60.19, 8414.80.19, 8414.90.39, 8432.90.00, 8481.10.00, 8481.20.90, 8481.80.92, 8483.60.1 e 8501.10.19) só são monofásicos quando a peça é própria para as máquinas e veículos indicados. Por isso ficam como condicionados: o CST da nota decide.
    - Códigos com destaque Ex (4016.99.90 Ex 03 e 05; 7320.10.00 Ex 01; 8481.80.99 Ex 01 e 02; 8536.50.90 Ex 01) só valem quando a nota informa o Ex. O 8413.91.00 Ex 01 foi desdobrado na TIPI e fica como condicionado.
    - `NCM`: monofásico.
    - `NCM ex:03,05`: monofásico só nesses destaques Ex da TIPI (campo EXTIPI da nota).
    - `NCM ?`: depende da destinação; o portal segue o CST da nota (02 ou 04) e avisa para conferir.
  - **Saíram da ST em 01/10/2026:** só afeta o ICMS (pneus e autopeças, Portaria SRE 34/2026). Itens com CEST 01 ou 16 entram automaticamente.
    - A lista padrão segue o texto oficial dos antigos Anexos VII (pneumáticos, câmaras de ar e protetores: 4011, 4012.90 e 4013) e XIV (autopeças, itens 1 a 127, com os NCMs desdobrados como no anexo) da Portaria CAT 68/2019, revogados pela Portaria SRE 34/2026, art. 1º, I. O item 112 (7314.50.00) está fora, porque foi revogado em 2022.
    - Pneus recauchutados ou usados (4012.11, 4012.12 e 4012.20) não estavam no Anexo VII e não são tratados como ST.
    - Vidros 7007.11.00 e 7007.21.00 (item 15) saíram da ST antes, em 01/01/2026 (Portaria SRE 64/2025): o portal usa essa data para eles.
    - Quando a lista da empresa é igual à padrão, ela é gravada vazia e passa a acompanhar as atualizações do portal.
- **Classificação de produtos comprados:**
  - Revenda: crédito de ICMS e de PIS/COFINS, este último só se o produto não for monofásico.
  - Insumo de serviço (peça aplicada na prestação do serviço): crédito de PIS/COFINS (art. 3º, II, das Leis 10.637/2002 e 10.833/2003), sem crédito de ICMS.
  - Uso e consumo: sem crédito de nenhum dos tributos.
  - Ativo: ICMS pelo CIAP.
- **Auditoria:**
  - Saída ainda emitida como ST após o corte.
  - CFOP de ST (5.403, 5.405, 6.404…) com ICMS normal destacado: só pedir CC-e, o crédito é aproveitável.
  - Nota de fornecedor tributada (CST 00) sem ICMS destacado.
  - Compra interestadual depois de 01/10 sem ICMS (CST 60 ou CFOP de ST): deveria ter 12% (ou 4% para importados).
  - Possível nota duplicada: mesmo fornecedor, data, itens e valores.
  - Fornecedor que reteve ST ou emitiu com CST 60.
  - Alíquotas internas e interestaduais.
  - Cálculo base × alíquota.
  - DIFAL.
  - PIS/COFINS em produto monofásico.
  - Monofásico vendido com CST diferente de 04 (por exemplo 07, isento): alerta para corrigir o cadastro do emissor.
  - Produto fora das listas de monofásico e alíquota zero vendido com CST 07, 08, 09, 49 ou 99 de PIS/COFINS (Lucro Real e Presumido): alerta, com o PIS/COFINS que seria devido se o produto for tributado.
- **Devoluções e remessas em garantia ao fornecedor** (CFOP 5.202/6.202, 5.411/6.411 e 5.949/6.949 com natureza de garantia, devolução ou troca): a remessa do produto defeituoso pelo adquirente é devolução (RICMS/SP, art. 4º, IV; RC 26.649/2022) e deve reproduzir a nota de compra. O portal localiza a nota original (pela NF-e referenciada ou, nas notas antigas, pelo fornecedor e NCM) e aponta:
  - devolução sem ICMS quando a compra teve ICMS destacado (erro quando a nota original está referenciada; alerta quando foi localizada só por fornecedor e NCM);
  - alíquota diferente da original;
  - compra com ST devolvida sem CST de ST, ou sem o ICMS próprio quando a compra teve CST 10/70; o ICMS-ST vai nas informações complementares e no total da nota (art. 127, § 5º; RC 33.446/2026 e RC 33.857/2026);
  - CST de ST na devolução de compra tributada normalmente, e ICMS destacado quando a compra não teve;
  - nota de devolução sem a NF-e original referenciada.
  Na apuração, a remessa em garantia passa a ser tratada como devolução de compra: o ICMS destacado é débito e o crédito de PIS/COFINS da compra é estornado.
- **Remessas sem venda** (notas de saída emitidas pelo cliente): o portal confere o tratamento esperado pelo CFOP.
  - Sem destaque de ICMS (alerta se destacou; aviso se o CST é tributado):
    - industrialização 5.901/5.902 (suspensão, art. 402);
    - depósito fechado e armazém geral internos 5.905 a 5.907 (não incidência, art. 7º, I a III);
    - comodato 5.908/5.909 (Súmula 573 do STF);
    - demonstração e mostruário 5.912/5.913 (suspensão, art. 319; Portaria SRE 56/2022);
    - exposição ou feira 5.914 (isenção, Anexo I, art. 33, até 31/12/2026);
    - conserto 5.915/5.916 (não incidência, art. 7º, IX e X);
    - vasilhame e sacaria 5.920/5.921 (isenção, Anexo I, art. 82).
  - Prazo de retorno: demonstração e exposição sem nota de retorno (CFOP x.913/x.914) depois de 60 dias geram alerta de ICMS devido.
  - Tributadas (alerta se saiu sem ICMS próprio, com a alíquota do produto no varejo): bonificação, doação e brinde 5.910 (art. 37, § 1º, 1) e consignação 5.917 (Ajuste SINIEF 2/1993). Pneus e autopeças com CST 60 depois de 01/10/2026 entram aqui.
  - Amostra grátis 5.911: aviso quando há ICMS destacado, para conferir as condições da isenção (Anexo I, art. 3º).
  - Transferência interestadual 6.151/6.152/6.155/6.156: alerta sem ICMS ou com alíquota diferente da interestadual. A transferência do crédito é obrigatória (LC 87/1996, art. 12, §§ 4º e 5º; Convênio ICMS 109/2024; RC 33.994/2026).
  - PIS/COFINS destacado em qualquer remessa: alerta (remessa não é receita; CST 49).
- **Monofásicos e alíquota zero gerais da lei** (bebidas, higiene, lubrificantes, pneus, cesta básica) valem para qualquer segmento; a lista da empresa acrescenta os específicos, como as autopeças dos Anexos da Lei 10.485/2002.
- **Fornecedor do Simples Nacional:** o crédito de ICMS é o valor informado em vCredICMSSN (LC 123/2006, art. 23).
- **Estoque em 30/09/2026 com ST:** o crédito do ICMS-ST do estoque segue a Portaria CAT 28/2020 (Portaria SRE 34/2026, art. 2º) e não é calculado pelo portal.
  - ICMS na base do PIS/COFINS.
  - Produtos sem classificação.
- **IBS/CBS 2026:** valores informativos, lidos dos XMLs.

Os valores são apurados a partir dos XMLs e não substituem a escrituração (SPED) nem a apuração oficial.

## Estrutura

```
index.html              página
css/app.css             visual
js/engine.js            leitura dos XMLs, apuração e auditoria
js/planilha.js          geração do arquivo Excel (.xlsx)
js/banco.js             acesso ao Supabase (login, dados, acessos)
js/app.js               telas
vendor/jszip.min.js     leitura de .zip
vendor/supabase.js      biblioteca do Supabase (v2.45.4)
exemplos/               notas fictícias para teste
```

## Classificação de produtos pelo cliente

- O cliente pode classificar os produtos comprados: um por um ou o grupo inteiro (por fornecedor, nome ou NCM). No caso do NCM, a classificação vale para os produtos que aparecem, não vira regra do NCM.
- Cada classificação feita pelo cliente fica marcada como "Pelo cliente". O cliente só pode desfazer as dele.
- O escritório vê um aviso na aba Produtos, filtra por "Pelo cliente" e confirma uma a uma ou todas de uma vez. Ao confirmar, a classificação passa a ser do escritório.
- O histórico mostra quem alterou (cliente ou escritório).
- No banco: a coluna `produtos.pelo_cliente` é preenchida por trigger (o cliente não consegue marcar como escritório). O cliente grava e altera só nas empresas a que tem acesso (`tem_acesso`) e só exclui linhas marcadas como dele. Regras por NCM continuam só do escritório.

## Selo de revisão das regras

- O cabeçalho mostra "Regras fiscais revisadas em dd/mm/aaaa conforme a legislação vigente". A data vem de `REVISAO` em `js/regras.js` e também aparece na aba Classificação e no Excel.
- Toda segunda-feira uma tarefa agendada consulta as fontes oficiais (SEFAZ-SP, Planalto, Receita Federal, CONFAZ, Portal da NF-e) e entrega um relatório com o que mudou e o que corrigir. Ela não altera o site: as correções, e a nova data do selo, só são aplicadas depois da aprovação do escritório.

## Demonstração e teste grátis

- **Links:** `#demo` (revenda de pneus e autopeças), `#demo-mercado` (mercadinho, Lucro Presumido) e `#teste` (teste grátis com as próprias notas). No painel do escritório há um botão para copiar cada link.
- **Cartão "O que o portal encontrou":** no topo da demo e do teste. Mostra o total a corrigir, quanto é a favor da empresa (vira "possível recuperação" quando o período já está fechado) e quanto é a recolher a mais. No Simples, lembra a segregação da receita monofásica e com ST no PGDAS-D.
- **Teste grátis:** o visitante escolhe ramo e regime e envia .zip ou XMLs. A leitura e a análise rodam no navegador dele: nada é enviado nem gravado. Ele vê o resumo, a apuração e as 5 primeiras pendências; as demais, o Excel e a impressão ficam para o relatório completo, com botões de WhatsApp para Cassiano e Vinicius.
- **Passo a passo de vendas:** na demo, o tour tem 5 passos (o dinheiro em jogo, cada erro explicado, antes e depois e o convite para o teste).
- **Prévia no WhatsApp:** `og.png` (1200×630) e as tags Open Graph no `index.html`.
- **Dados fictícios do mercadinho:** `exemplos/notas-mercadinho.zip` (NFC-e diárias de set. e out./2026 e compras de três fornecedores), com erros típicos: arroz tributado a 18% (isento), sabão em pó como ST depois de 01/08/2026, shampoo com PIS/COFINS em setembro (monofásico).

## DIFAL

Aba **DIFAL** no painel (escritório e cliente), também no Excel (abas "DIFAL vendas" e "DIFAL compras").

- **Vendas para outros estados** (NF-e própria, CFOP de venda, destino fora de SP):
  - O tipo do comprador vem do XML: indicador de IE 9, sem IE ou CPF é tratado como consumidor final não contribuinte; contribuinte com indicador de consumidor final é uso e consumo; o resto é revenda.
  - Quem usa o portal pode trocar o tipo de cada comprador. A escolha fica salva por comprador na tabela `difal_destinatarios`, com RLS por `tem_acesso`. Na demo e no teste grátis fica só na tela.
  - Quando o cliente troca o tipo, a linha fica marcada como "Pelo cliente" (coluna `pelo_cliente`, preenchida por trigger) e o escritório vê um aviso para confirmar uma a uma ou todas.
  - Para não contribuinte: DIFAL = valor × (alíquota interna do destino − interestadual) + FCP, com base única (EC 87/2015; LC 87/1996, art. 13, IX, na redação da LC 190/2022; Convênio ICMS 236/2021). Os estados que exigem base dupla por lei própria podem ser marcados na tabela de alíquotas.
  - Compara com o grupo ICMSUFDest da nota e avisa quando falta ou diverge.
  - Totais por estado, para a GNRE.
- **Compras de outros estados** (DIFAL devido a SP):
  - Simples Nacional: todas as compras sem ST, para qualquer destinação; valor × (interna − interestadual), vencimento no último dia do 2º mês seguinte (RICMS/SP, art. 115, XV-A, a, e § 8º; LC 123/2006, art. 13, § 1º, XIII, h).
  - Regime normal: só uso e consumo ou ativo (classificação da aba Produtos), com base dupla (RICMS/SP, art. 2º, XIV, e art. 37, VI e § 11), na apuração do mês.
  - Itens comprados com ICMS-ST ficam fora.
- **Simulador**: estado, tipo do comprador, valor e origem; mostra o cálculo.
- **Alíquotas internas por UF**: `Regras.DIFAL_UF` em `js/regras.js` (modal de cada estado + FCP geral). Editáveis na tela, salvas no navegador. Para mudar o padrão de todos, altere a tabela no código (a revisão semanal confere).

O parser passou a guardar `indFinal`, a IE do destinatário e o grupo ICMSUFDest de cada item. Notas importadas antes disso aparecem sem o valor do DIFAL da nota (só "sim", quando havia o grupo).

## Reduções de base na compra (alíquota do fornecedor)

- Compras internas com CST 20 têm a carga efetiva conferida (ICMS ÷ valor do item), não só a alíquota.
- Máquinas e implementos agrícolas do Anexo II do Convênio ICMS 52/91, inclusive peças e partes das posições 8201, 8432, 8433 e 8436, tratores agrícolas e reboques agrícolas: carga de 5,6% é aceita como correta (RICMS/SP, Anexo II, art. 12, IV; benefício vigente até 31/12/2026, Decreto 70.589/2026). Carga de 8,8% em máquinas industriais (art. 12, II) também.
- CST 20 com carga que o portal não reconhece gera alerta sem impacto, pedindo a confirmação do dispositivo. CST 00 com alíquota diferente de 18% continua como alerta.

## Ramo: calçados, vestuário e acessórios

- Segmento `moda` (escritório, teste grátis e demo `#demo-moda`, empresa fictícia no Lucro Real). Usa a mesma conferência por NCM do varejo.
- PIS/COFINS: vestuário (61, 62), calçados (64), bolsas e artigos de viagem (4202), vestuário de couro (4203), chapéus e bonés (6504, 6505), joias e bijuterias (7113, 7117), relógios (9101, 9102, 9113), brinquedos (9503) e artigos esportivos (9506) são tributados (CST 01). Venda desses itens com CST 04 ou 06 é erro.
- Cosméticos e perfumaria (33.03 a 33.07, exceto 33.06; 3401.11.90, exceto o Ex 01; 3401.20.10; 9603.21.00) são monofásicos (Lei 10.147/2000, art. 1º, I, "b", na redação da Lei 12.839/2013).
- ICMS a 25% (RICMS/SP, art. 55): perfumes e cosméticos (3303, 3304, 3305 e 3307, exceto xampus 3305.10 e desodorantes 3307.20, que são 18%; 3304.99.90 fica como "conferir" por causa dos protetores solares), peleteria (4303), raquetes e bolas de tênis e tacos e bolas de golfe.
- Uso e consumo do comércio (sacolas, cabides, limpeza) não dá crédito de PIS/COFINS; classifique na aba Produtos.
- Calçados (64) e bolsas e artigos de couro (41, 42, 3926.20.00) só têm redução de base na saída do fabricante (carga de 12% e 7%; RICMS/SP, Anexo II, art. 30, até 31/12/2026), nunca para consumidor final ou Simples. O varejista vende a 18%.
- Cosméticos e higiene (3303 a 3307, 3401, 4818 e 9603.2): carga de 12% só na saída de fabricante ou atacadista para contribuinte fora do Simples (Anexo II, art. 34). Na venda do varejo: 25% ou 18%, conforme o art. 55.

## ST de eletrônicos (Portaria CAT 68/2019, Anexo XXII)

- Itens que seguem na ST (impressoras, informática, mouses e teclados, monitores, telefonia, som, ar-condicionado, climatizadores, iluminação 9405 etc.) ficam como "depende do CEST": com CEST 21.xxx é ST; com outro CEST, não.
- Saíram da ST em 01/08/2026 (Portaria SRE 19/2026): lavadoras e secadoras, aspiradores, eletroportáteis, ferros, fornos elétricos, coifas, lavadoras de pressão, furadeiras e balanças domésticas.
- Saíram em 01/10/2026 (Portaria SRE 34/2026): refrigeradores, freezers, adegas e lava-louças.
- Saem em 01/02/2027 (Portaria SRE 52/2026): fogões, micro-ondas, partes de lavadoras, barbeadores, purificadores de água e secadores de cabelo.
- Informática da Resolução SF 31/2008: 12% (RICMS/SP, art. 54, V), marcado como "conferir". O complemento de 1,3% (§ 7º) foi revogado em 15/01/2023.

## Compra de pessoa física (NF de entrada própria)

- Nota de entrada emitida pela empresa (tpNF 0) para pessoa física sem inscrição (CPF ou indicador de IE 9), fora das devoluções de venda: ICMS destacado gera erro `ENT_PF_CRED`, e o "após correções" estorna o crédito. A nota documenta a entrada (RICMS/SP, art. 136, I, "a", e art. 138; RC 5.239/2015) sem destaque, e só há crédito do imposto anteriormente cobrado (arts. 59 e 61).
- Essas compras também não geram crédito de PIS/COFINS (Leis 10.637/2002 e 10.833/2003, art. 3º, § 3º, I).
- Devolução feita por consumidor pessoa física (CFOP 1.202/1.411) não entra nessa regra.

## Empresas do Paraná (ST e antecipação)

No cadastro (aba do escritório, bloco do ramo) escolha **Estado da empresa = Paraná**. Com isso:

- Alíquota interna de 19,5% (RICMS/PR, art. 17, V). A regra de corte da ST de São Paulo não se aplica.
- Autopeças e pneus continuam com ST (RICMS/PR, Anexo IX, Seção V, arts. 28 a 30; Seção XXI, arts. 116 e 117).
- **Compra de outro estado sem retenção** (`PR_ST_ANTEC`): calcula a antecipação na entrada (Anexo IX, art. 11; art. 74, VII, "a"). Base = valor + frete + IPI − desconto, com a MVA da Resolução SEFA 571/2019 ajustada (Anexo IX, art. 1º, § 5º). Do resultado sai o ICMS próprio da nota.
- **ST retida a menor** (`PR_ST_MENOR`): mostra a diferença.
- **Venda interna de item com ST com ICMS destacado** (`PR_ST_SAIDA`): deveria sair com CST 60.
- **CST 60 em item fora da lista** (`PR_ST_INDEV`).
- **Venda interestadual de item que já pagou ST** (`PR_ST_RESS`): indica ressarcimento pela EFD (Anexo IX, art. 6º).
- A aba **ST Paraná** mostra a antecipação a recolher por mês e o cálculo nota a nota.
- MVAs usadas:

  | Item | MVA |
  |---|---|
  | Autopeças | 71,78% |
  | Pneus de automóvel | 40,73% |
  | Pneus de caminhão e ônibus | 31,03% |
  | Pneus de moto | 65,58% |
  | Outros pneus | 55,32% |
  | Pneus de bicicleta | 105% |
  | Câmaras e protetores | 74,58% |

  Elas devem ser conferidas quando sair uma nova resolução da SEFA.
- As conferências específicas de São Paulo ficam desligadas: crédito de pessoa física, remessas, devoluções, cadastro do varejo e DIFAL de compras.
- **Preparar guia**: em cada mês e em cada nota da aba ST Paraná, mostra os dados da GR-PR prontos para copiar (código de receita 122-8, marcado como "a confirmar"; CNPJ; IE; referência; valor; vencimento; informações complementares com a chave da NF-e) e o link para a emissão no site da Receita Estadual do PR. A guia em si é emitida no site oficial.
