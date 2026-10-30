# Portal Fiscal

Apuração de ICMS, PIS e COFINS e auditoria de notas fiscais (NF-e e NFC-e) para empresas de pneus e autopeças em SP, no Lucro Real.

O site fica no GitHub Pages e os dados ficam no Supabase, no projeto **Orçamentos** (`ekhtiductqttqgpyetlk`). Cada pessoa entra com e-mail e senha.

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
- **ICMS-ST em SP:** segmentos que continuam na ST (bebidas do Anexo III, cigarros, parte dos alimentícios conforme o CEST, materiais de construção) e os que saíram em 2026.
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
    - `NCM`: monofásico.
    - `NCM ex:03,05`: monofásico só nesses destaques Ex da TIPI (campo EXTIPI da nota).
    - `NCM ?`: depende da destinação; o portal segue o CST da nota (02 ou 04) e avisa para conferir.
  - **Saíram da ST em 01/10/2026:** só afeta o ICMS (pneus e autopeças, Portaria SRE 34/2026). Itens com CEST 01 ou 16 entram automaticamente.
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
