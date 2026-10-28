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

A estrutura do banco está registrada nas migrations do projeto no Supabase (`portal_fiscal_estrutura` e `portal_fiscal_permissoes_funcoes`).

## Documentos aceitos

| Documento | Como entra na apuração |
|---|---|
| NF-e e NFC-e | ICMS, PIS/COFINS e auditoria por item. |
| CT-e | Crédito de ICMS e de PIS/COFINS só quando a empresa é a tomadora do frete. No frete de compra de produtos monofásicos, não há crédito de PIS/COFINS. Quando quem paga é outro (por exemplo, o Mercado Livre), o CT-e é só informativo. A auditoria confere a alíquota interestadual (7% ou 12%), os 12% do frete interno em SP e o cálculo base × alíquota. |
| NFS-e prestada (padrão nacional) | Débito de PIS/COFINS, ISS a recolher e retido, e retenções federais sofridas. A auditoria confere alíquota de ISS fora de 2% a 5%, o cálculo do ISS, o CST e os valores de PIS/COFINS. |
| NFS-e tomada (padrão nacional) | Crédito de PIS/COFINS só para o serviço classificado como insumo da prestação de serviço. Mostra o ISS e as retenções federais que a empresa reteve e deve recolher. |

Eventos de cancelamento de NF-e, CT-e e NFS-e retiram o documento da apuração.

## Regras fiscais aplicadas

- **ICMS/SP:** pneus e autopeças com tributação normal a partir de 01/10/2026 (Portaria SRE 34/2026).
  - Alíquota interna de 18%. Na interestadual, 12% ou 7%, e 4% para mercadoria importada.
  - Entradas com ST antes do corte não geram crédito. Uso e consumo não gera crédito. Ativo segue o CIAP.
- **PIS/COFINS não cumulativo:** 1,65% e 7,6%. O ICMS fica fora da base do débito (Tema 69/STF) e da base do crédito (Lei 14.592/2023).
- **Monofásicos (Lei 10.485/2002):** sem débito na revenda e sem crédito na compra.
- **Classificação de produtos comprados:**
  - Revenda: crédito de ICMS e de PIS/COFINS, este último só se o produto não for monofásico.
  - Insumo de serviço (peça aplicada na prestação do serviço): crédito de PIS/COFINS (art. 3º, II, das Leis 10.637/2002 e 10.833/2003), sem crédito de ICMS.
  - Uso e consumo: sem crédito de nenhum dos tributos.
  - Ativo: ICMS pelo CIAP.
- **Auditoria:**
  - Saída ainda emitida como ST após o corte.
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
js/banco.js             acesso ao Supabase (login, dados, acessos)
js/app.js               telas
vendor/jszip.min.js     leitura de .zip
vendor/supabase.js      biblioteca do Supabase (v2.45.4)
exemplos/               notas fictícias para teste
```
