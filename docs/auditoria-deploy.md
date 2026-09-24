# Auditoria antes do deploy

## Evidências locais

- Build de produção concluído após as correções.
- Quatro testes de regressão do Gemini passam: `node --test lib/gemini.test.js`.
- Cinco cenários de cobrança simulados passaram; não são testes com o provedor real.
- Lint completo: 68 erros e 125 avisos. Não equivalem a 68 falhas confirmadas em execução. É necessário avaliar impacto e distinguir problemas anteriores de regressões.
- Login/cadastro e pagamentos ainda não foram validados ponta a ponta.

## Preparação necessária para preview

1. Identificar o Firebase e a loja de teste. `src/services/firebase.js` fixa o projeto Firebase no código; variáveis de preview sozinhas não o substituem.
2. Fazer as três chamadas de assinatura em `AdminLegacy.jsx` usarem a API do preview durante a homologação. Atualmente usam o domínio de produção fora de localhost.
3. Configurar a seleção da loja em preview: `domainHelper.js` retorna `vercel-fallback` para um domínio Vercel comum.
4. Evitar que o cadastro no preview redirecione para o subdomínio de produção.
5. Conferir variáveis de backend e credenciais sandbox. Autorizar o domínio de preview no Firebase Auth do ambiente de teste.
6. Publicar preview e registrar sua URL e a revisão exata testada.

## Aceitação no preview

Registrar resultado, horário e evidência de cada cenário sem tokens, senhas ou dados pessoais.

- Login por e-mail e Google, logout e novo login.
- Cadastro com slug livre; slug ocupado exibe erro sem ficar carregando.
- Fatura pendente: valor gerado corresponde ao registro do servidor.
- Avulsa: conferir plano e ciclo mensal/semestral.
- Alterar `amount` na requisição não altera o valor definido no servidor.
- Usuário sem acesso à loja é rejeitado; requisição sem autenticação é rejeitada.
- Fatura paga ou inexistente é rejeitada.
- Gemini: geração real de texto funciona; testes locais cobrem fallback 404.
- Cardápio, carrinho, frete e pedido de teste funcionam.
- Logs das funções sem exceções inesperadas durante os testes.

## Publicação

Promover somente a revisão validada. Manter anotado o deployment anterior para reversão.
A alteração em `firebase-functions/index.js` exige publicação separada das Cloud Functions: essa pasta está excluída da Vercel em `.vercelignore`.

Não houve publicação em produção durante esta auditoria.

## Preview da lojateste

- Preview solicitado: https://si-delivery-1amfo9em3-velo-delivery.vercel.app
- Build configurado com `VITE_PREVIEW_STORE_ID=lojateste`; backend com `PREVIEW_STORE_ID=lojateste`.
- API de assinatura usa a origem do preview. Cadastro não redireciona para produção em domínio Vercel.
- StoreContext lê o documento da loja configurada no preview, inclusive quando falta o campo slug.
- `.env` e `.env.*` excluídos do upload; exclusão verificada com `vercel deploy --dry --json`.
- Loja confirmada no Firestore, com produtos na coleção raiz. Sem ownerUid, plano ou usuário encontrado por `users.storeId == lojateste`.
- Ambiente compartilha Firebase e credenciais de integrações com produção. Não é um sandbox financeiro isolado.
- O primeiro HTTP 200 retornou a página temporária de build da Vercel e não conta como teste aprovado do aplicativo.
- Testes de acesso ao painel e cobrança autenticada pendentes de conta autorizada da loja.

## Resultado da publicação de preview

Deployment `dpl_BRRhEJeezpeFfCGnpVuUwzvsU4D3`: READY.

- Build remoto e empacotamento das funções concluídos.
- GET /: HTTP 200, HTML contém o bundle `/assets/index-CYoAq8sq.js`.
- POST /api/pay-subscription-mp sem token: HTTP 401, JSON de token ausente.
- POST /api/pay-subscription-mp-pix sem token: HTTP 401, JSON de token ausente.
- POST /api/pay-subscription-efi-pix sem token: HTTP 401, JSON de token ausente.
- Nenhum pagamento concluído e nenhum deployment de produção realizado.
- Sem execução automatizada de navegador: o HTTP 200 não confirma renderização ou navegação no React.
- Próximo teste humano: abrir /login no preview com uma conta autorizada; validar /admin e as funções da loja. Não concluir pagamentos reais durante homologação.
- A proteção de deployment está ativa; o acesso humano pode exigir login na Vercel com acesso ao projeto.

## Produção — 24/09/2026

- Deployment publicado e promovido: `dpl_5LsZqMEekirDU8zmfBhYj1p7Sqpv`.
- URL: https://si-delivery-2044kfohj-velo-delivery.vercel.app
- Anterior para reversão: https://si-delivery-8po8cn1cp-velo-delivery.vercel.app
- Publicação feita a partir do workspace com alterações locais, sem commit novo.
- Build local e remoto concluídos; 4 testes Gemini e 63 testes simulados de cobrança passaram.
- `/login` no deployment: HTTP 200 com `/assets/index-CbWeXH1U.js`.
- As três rotas de assinatura retornaram HTTP 401 sem autenticação.
- Promoção concluída; alias confirmado: https://si-delivery-app-velo-delivery.vercel.app. O domínio www.velodelivery.com.br serve uma landing page própria e não confirmou o bundle deste aplicativo.
- Firebase: `functions:gerarCopyProduto` publicada com sucesso em `zetesteapp`, região `southamerica-east1`.
- `VITE_PREVIEW_STORE_ID` e `PREVIEW_STORE_ID` explicitamente vazios neste deployment de produção.
- Lint completo desta sessão falhou por falta de memória; uma segunda tentativa foi interrompida. A auditoria anterior registra 68 erros e 125 avisos.
- Permanecem pendentes os testes manuais de login/cadastro, navegação e pagamentos ponta a ponta. Nenhum pagamento real foi executado nesta sessão.
- Verificação final: https://www.convenienciasantaisabel.com.br/ respondeu HTTP 200 com `/assets/index-CbWeXH1U.js`, confirmando a versão nova no domínio público da loja.
- `vercel alias ls` também confirmou os domínios Macanudo Rex, Coelhos Cuca e filial Santa Isabel apontando para o deployment novo.
