# Gestão multiloja — Love Picados + Xis da Lê

## Grupo piloto (não ativado)
- Contato administrador informado: `lovelanchesviamao@gmail.com`
- Lojas existentes: `lovepicados` e `xisdale`
- Painéis: `https://lovepicados.velodelivery.com.br/admin` e `https://xisdale.velodelivery.com.br/admin`
- O e-mail sozinho **não** concede acesso: identificar o UID autenticado e confirmar propriedade/autorização de ambas as lojas antes de vincular.

## Invariantes de segurança
1. Não substituir `users/{uid}.storeId` existente por outro ID; preservar compatibilidade com usuários legados.
2. Não derivar autorização do hostname, query string, localStorage ou de e-mail fornecido no cliente.
3. Painéis de subdomínio fixam o `storeId` ao hostname; o seletor navega para o outro host, sem injetar tenant em runtime.
4. Em cada leitura/gravação, validar no servidor/regras a autorização do UID para o `storeId` selecionado. `ProtectedRoute` hoje confere apenas sessão; não é barreira de autorização.
5. Isolar pedidos, cardápio, clientes, integrações, tokens, caixa e automações por `storeId`. Consulta consolidada somente para administrador de grupo autorizado.
6. Não alterar os mapeamentos existentes de domínio e SEO nem o onboarding dos demais lojistas.

## Modelo proposto
- `business_groups/{groupId}`: name, createdAt, status.
- `business_groups/{groupId}/stores/{storeId}`: referência de participação; somente provisionamento privilegiado.
- `business_groups/{groupId}/members/{uid}`: role ('owner' ou 'manager'), status, createdAt.
- Uma associação global indexada por UID pode acelerar a busca dos grupos; nunca confiar nela como único mecanismo de permissão.
- `stores/{storeId}` e `settings/{storeId}` permanecem intactos.

## Fluxo de ativação
1. Verificar `stores/lovepicados` e `stores/xisdale` no Firebase e a titularidade cadastrada.
2. Verificar conta Firebase Auth do e-mail informado e identificar `uid`.
3. Confirmar a autorização do proprietário das duas lojas e adicionar vínculo de grupo por operação administrativa autenticada.
4. Implementar consultas/ações autorizadas e regras Firestore, inclusive funções e endpoints Vercel, e testar negação de acesso a loja não vinculada.
5. Adicionar seletor ao `AdminLegacy.jsx`, mostrando apenas lojas autorizadas e navegando para seus subdomínios; incluir opção consolidada separada.
6. Testar login único (Firebase Auth é compartilhado, mas persistência da sessão deve ser verificada ao alternar subdomínios), permissões, redirecionamento, faturamento e isolamento.
7. Publicar apenas após homologação; sem disparos de marketing e sem ativação de cobranças duplicadas.

## Código relevante já conferido
- `src/context/StoreContext.jsx`: store derivada do hostname, fallback `users/{uid}.storeId`.
- `src/pages/Login.jsx`: `createStoreInDb` escreve `users/{uid}.storeId` durante cadastro; evitar sobrescrever ao anexar nova loja.
- `src/pages/Admin.jsx`: carrega `AdminLegacy.jsx`.
- `src/App.jsx`: `ProtectedRoute` verifica apenas usuário autenticado.
- `src/utils/domainHelper.js`: resolução de `storeId` pelo domínio.
