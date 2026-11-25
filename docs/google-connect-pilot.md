# Google Connect — piloto Mercado Monte Verde

## Escopo desta entrega
OAuth por serviço para GA4 (propriedades/fluxos web), GTM (containers web) e Ads (ações WEBPAGE/PURCHASE com snippet compatível). Mantém os campos legados e o rastreamento já instalado. Não cria nem publica tags, propriedades, containers ou conversões nesta fase. Ads com conversões compartilhadas por MCC precisa de validação específica. Revogação/desconexão completa e validação de saúde são etapas seguintes.

## Configuração central
- Google Cloud: confirmar Analytics Admin API, Analytics Data API, Tag Manager API e Google Ads API, escopos OAuth e publicação/verificação do app.
- Vercel: reaproveitar GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET, cadastrar GOOGLE_CONNECT_ENCRYPTION_KEY (32 bytes aleatórios representados em 64 caracteres hexadecimais, segredo server-side; não versionar), GOOGLE_CONNECT_PILOT_STORES=mercadomonteverde. Para Ads: habilitar a Google Ads API e confirmar o nível de acesso no projeto Cloud das credenciais OAuth; o token de desenvolvedor deixou de ser obrigatório em setembro de 2026. GOOGLE_ADS_API_VERSION opcional (padrão v25).
- Preview: registrar URL de callback própria no OAuth Google e configurar GOOGLE_CONNECT_REDIRECT_URI para essa URL HTTPS com path /api/google-callback. Não encaminhar uma sessão preview ao callback de produção. Produção usa o callback existente em app.velodelivery.com.br.
- Firestore: negar explicitamente leituras/escritas pelo SDK cliente nas coleções google_connect_sessions e google_connect_credentials, inclusive regras wildcard permissivas. Aplicar TTL no campo expiresAt das sessões. O servidor cifra os dados com AES-GCM e vincula o contexto ao recurso; rotação da chave exige estratégia de migração/reconexão.

## QA antes de merge
1. Executar node --test tests/googleConnect.test.mjs tests/googlePurchase.test.mjs e npm run build.
2. Validar preview com usuário da loja autorizada, outra loja e cancelamento/reconexão.
3. Autorizar cada serviço no Google e conferir a lista de recursos; conferir propriedade/fluxo, container e conversão selecionados. No preview, a seleção de GA4 deve renovar o token e realizar uma consulta de sessões pela Analytics Data API, sem persistir credenciais ou alterar a loja. Uma consulta sem linhas também é válida; uma falha de API impede a conclusão.
4. Conferir Data Fuel, instalação de tags e um pedido controlado, sem duplicar eventos. Não ativar tags nem criar campanhas automaticamente.
5. Conferir que os três formulários legados continuam funcionando e que demais integrações permanecem intactas.
6. Só depois liberar a primeira loja em produção e avaliar expansão. Não alterar o OAuth GMB legado nesta entrega; auditar seu state separadamente.

## Gate de produção
Manter GOOGLE_CONNECT_DRY_RUN=true até verificar as regras ativas do Firestore (não apenas um arquivo local): clientes web/mobile, inclusive autenticados e de outras lojas, não podem ler, listar ou escrever google_connect_sessions e google_connect_credentials. Regras wildcard permissivas também devem ser corrigidas, pois permissões sobrepostas são cumulativas. Não substituir o conjunto de regras existente sem auditoria. Após validação de regras e TTL, liberar apenas as duas lojas piloto, testar persistência, saúde GA4 e desconexão local. O desligamento do OAuth mantém os IDs de rastreamento e não revoga o grant Google compartilhado da agência. GTM e Ads são seleção/configuração de recurso, não prova de disparo de tags ou conversões. Para ampliação, cadastrar os UIDs autorizados por loja no servidor; nunca usar autorização de cliente como única fonte sem validar as regras. Não ativar campanhas ou publicar tags automaticamente.
