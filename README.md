[README.md](https://github.com/user-attachments/files/34038626/README.md)
# Portal Fiscal

Apuração de ICMS, PIS e COFINS e auditoria de notas fiscais (NF-e e NFC-e) para empresas de pneus e autopeças em SP, no Lucro Real. O site é estático e roda inteiro no navegador: os XMLs nunca saem do computador do escritório, e o que vai para o GitHub é um arquivo **cifrado** por cliente.

## Como funciona

| Quem | Onde | O que faz |
|---|---|---|
| Escritório | `…/#escritorio` | Importa os XMLs, classifica os produtos, revisa as pendências e publica o arquivo cifrado. |
| Cliente | `…/#c=<código>` | Digita a senha e vê a apuração e as pendências, só para leitura. |

- O rascunho de cada empresa fica guardado no navegador do escritório (IndexedDB).
- Cada publicação gera `data/<código>.json`, cifrado com a senha do cliente (AES-GCM 256, chave derivada por PBKDF2-SHA256 com 600 mil iterações). Sem a senha, o arquivo não pode ser lido, mesmo com o repositório público.
- O histórico de classificação de produtos (revenda, uso e consumo, ativo) vai junto no arquivo cifrado. Para continuar em outro computador, use **Continuar uma apuração publicada** com o código e a senha.

## Colocar no ar (GitHub Pages)

1. Crie um repositório no GitHub, por exemplo `portal-fiscal`, e envie todos os arquivos desta pasta, mantendo as subpastas.
2. No repositório, abra **Settings › Pages**. Em **Source**, escolha **Deploy from a branch**, branch `main` e pasta `/ (root)`. Salve.
3. Em 1 a 2 minutos, o site fica disponível em `https://<seu-usuario>.github.io/portal-fiscal/`.
4. A área do escritório fica em `https://<seu-usuario>.github.io/portal-fiscal/#escritorio`.

## Publicar a apuração de um cliente

**Sem token (manual):**

1. Na área do escritório, abra a empresa, vá em **Escritório › Publicar para o cliente**, gere a senha e clique em **Gerar arquivo cifrado**.
2. No GitHub, abra a pasta `data`, clique em **Add file › Upload files** e envie o arquivo `<código>.json`. Se o arquivo já existir, ele é substituído.
3. Envie ao cliente o link (botão **Copiar**) e a senha, **por canais diferentes**. Por exemplo: o link por e-mail e a senha por WhatsApp.

**Com token (um clique):**

1. No GitHub, abra **Settings › Developer settings › Personal access tokens › Fine-grained tokens › Generate new token**.
2. Em **Repository access**, escolha **Only select repositories** e selecione só este repositório.
3. Em **Permissions › Contents**, escolha **Read and write**.
4. Na tela **Empresas** do site, preencha usuário, repositório e token e clique em **Salvar e testar**.

A partir daí, **Publicar no GitHub** envia o arquivo direto. O token fica só no navegador de quem configurou.

## Cuidados

- **Senha:** como o arquivo cifrado fica público, a senha precisa ser forte. Use o botão **Gerar**, que cria 16 caracteres aleatórios, e evite senhas inventadas. Se a senha vazar, gere uma nova e publique de novo.
- **Repositório:** pode ser público. Os arquivos em `data/` são ilegíveis sem a senha. Os nomes dos arquivos são códigos aleatórios e não revelam o cliente.
- **Senha perdida:** não há como recuperar o conteúdo. Abra o rascunho no navegador do escritório, defina uma senha nova e publique de novo.
- **Rascunho:** fica neste navegador. Limpar os dados do navegador apaga os rascunhos, mas não o que já foi publicado.

## Regras fiscais aplicadas

- **ICMS/SP:** pneus e autopeças com tributação normal a partir de 01/10/2026 (Portaria SRE 34/2026). A data de corte pode ser ajustada por empresa.
- **Alíquotas:** 18% na operação interna. Na interestadual, 12% ou 7%, e 4% para mercadoria importada.
- **Créditos:** entradas com ST antes do corte não geram crédito. Uso e consumo não gera crédito. Ativo segue o CIAP.
- **PIS/COFINS não cumulativo:** 1,65% e 7,6%. O ICMS fica fora da base do débito (Tema 69/STF) e da base do crédito (Lei 14.592/2023).
- **Monofásicos (Lei 10.485/2002):** sem débito na revenda e sem crédito na compra. A lista de NCM pode ser editada por empresa.
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
index.html            página
css/app.css           visual
js/engine.js          leitura dos XMLs, apuração e auditoria
js/cofre.js           criptografia, rascunho local e envio ao GitHub
js/app.js             telas
vendor/jszip.min.js   leitura de .zip
data/                 arquivos cifrados publicados (um por cliente)
exemplos/             notas fictícias para teste
```
