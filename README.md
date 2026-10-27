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

1. No site, clique em **Criar conta** e cadastre o e-mail do escritório.
2. Confirme pelo link recebido por e-mail.
3. Promova a conta a escritório no Supabase: abra o **SQL Editor** do projeto e rode o comando abaixo, trocando o e-mail.

```sql
update public.perfis set papel = 'escritorio' where email = 'seu-email@escritorio.com.br';
```

## Configuração do Supabase (Authentication › URL Configuration)

Em **Redirect URLs**, adicione o endereço do site, por exemplo `https://fortec-2026.github.io/auditoria/`. Sem isso, os links de confirmação de e-mail e de nova senha não voltam para o portal.

## Banco de dados

| Tabela | Conteúdo |
|---|---|
| `empresas` | Clientes do escritório. Guarda a data de corte da ST e a lista de NCM monofásicos de cada um. |
| `notas` | Uma linha por chave de acesso, com a nota lida do XML e a marca de publicada. |
| `cancelamentos` | Chaves de notas canceladas. |
| `produtos` e `ncm_regras` | Classificação de produtos: revenda, uso e consumo ou ativo. |
| `classificacao_historico` | Quem mudou cada classificação, quando, e de qual classe para qual. |
| `empresa_usuarios` | Quais e-mails veem quais empresas. |
| `perfis` | Papel de cada usuário: escritório ou cliente. |
| `publicacoes` | Registro de cada publicação. |

A estrutura do banco está registrada nas migrations do projeto no Supabase (`portal_fiscal_estrutura` e `portal_fiscal_permissoes_funcoes`).

## Regras fiscais aplicadas

- **ICMS/SP:** pneus e autopeças com tributação normal a partir de 01/10/2026 (Portaria SRE 34/2026).
  - Alíquota interna de 18%. Na interestadual, 12% ou 7%, e 4% para mercadoria importada.
  - Entradas com ST antes do corte não geram crédito. Uso e consumo não gera crédito. Ativo segue o CIAP.
- **PIS/COFINS não cumulativo:** 1,65% e 7,6%. O ICMS fica fora da base do débito (Tema 69/STF) e da base do crédito (Lei 14.592/2023).
- **Monofásicos (Lei 10.485/2002):** sem débito na revenda e sem crédito na compra.
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
