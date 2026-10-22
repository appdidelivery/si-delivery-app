# WhatsApp oficial — onboarding dos lojistas Velo

## Fluxo implantado
- Admin > Integrações > Conectar WhatsApp Oficial — Meta.
- Lojista escolhe **Já uso WhatsApp Business (Coexistência)** ou **Novo número para API**.
- Facebook Login for Business / Embedded Signup (Meta v4) retorna código de autorização.
- Backend `POST /api/whatsapp-embedded-signup` valida identidade da loja, troca código no servidor, valida permissões, WABA/número, impede vinculação cruzada e assina `/{waba_id}/subscribed_apps`.
- Coexistência concluída: armazena dados nas configurações da loja. Novo número: fica em `integrations.whatsappPending` até `POST /{phone_number_id}/register` com PIN de seis dígitos; não inicia automações antes do registro.
- Lojas já integradas via Cloud API (ex.: csi) não são modificadas.
- O onboarding **não utiliza Evolution/WhatsApp Web**. O recurso antigo foi retirado da UI e das rotas ativas.

## Passos externos obrigatórios para habilitação real
1. No app Meta **associado ao `META_APP_ID` já existente**, habilitar produto WhatsApp e **Embedded Signup / Facebook Login for Business versão v4**.
2. Criar configuração de Embedded Signup com WhatsApp Business Accounts, números e permissões `whatsapp_business_management` e `whatsapp_business_messaging`. Habilitar Coexistência na configuração se desejar suportar números existentes no WhatsApp Business.
3. Concluir Business Verification, App Review e Advanced Access necessários para que lojistas externos possam autorizar. Sem aprovação, o fluxo pode funcionar apenas para administradores/testadores do app.
4. Configurar domínios JS SDK/OAuth: `app.velodelivery.com.br` e outros hosts de painel permitidos, com redirect URLs exatas segundo a configuração Meta.
5. Confirmar configuração do produto Webhooks no app Meta: callback HTTPS `https://app.velodelivery.com.br/api/whatsapp-webhook` (já existente), assinatura de `messages` e campos da modalidade Coexistência (`account_update`, `history`, `smb_app_state_sync`, `smb_message_echoes`). Verificar entrega e resposta em loja de teste.
6. No Vercel do projeto, cadastrar **somente após criar a configuração Meta** `META_WHATSAPP_CONFIG_ID` (ID da configuração v4), `META_WHATSAPP_APP_ID` (ID do app Velo Delivery), `META_WHATSAPP_APP_SECRET` (segredo exclusivo do app Velo Delivery) e `META_WEBHOOK_VERIFY_TOKEN` (igual ao token definido no Webhooks da Meta). **Não substituir tokens existentes sem validar o callback**: o webhook já atende Conveniência Santa Isabel.
7. Testar com novo lojista e números válidos; conferir `phone_number_id`, `waba_id`, recebimento, resposta e status de entrega. Para números novos, concluir registro com PIN. Para coexistência, validar eventos e sincronização exigidos pela Meta.

## Segurança e restrições
- Nunca colocar `META_WHATSAPP_APP_SECRET` no browser. O backend executa a troca do código. Não usar `META_APP_SECRET` legado de anúncios no WhatsApp.
- O `configId` e `appId` retornados pela rota de status são identificadores públicos.
- O endpoint restringe a integração ao proprietário ou administrador autorizado, não altera uma conexão ativa e não devolve credenciais em respostas de status.
- O fluxo de QR/Coexistência **não é** uma sessão WhatsApp Web.
- O sistema legado guarda `apiToken` em `settings.integrations.whatsapp` para manter compatibilidade com chat e rotinas existentes. É necessário um trabalho posterior de migração de segredos para armazenamento restrito ao servidor, com revisão das regras Firestore.
- A tela verifica presença das variáveis mas não comprova aprovação na Meta: esta depende de ativação externa e teste real.

## Rollout
Recomendado: testar o Monte Verde assim que houver chip e aprovação Meta; preservar a CSI; expandir aos demais lojistas depois da validação de ponta a ponta.


## Liberação segura do onboarding v4 (22/10/2026)

- A aba **Admin > Integrações** mantém a visualização da conexão nativa já existente.
- Para uma nova loja, o botão abre **/admin/whatsapp-meta**, página autenticada exclusiva. O navegador reinicia nesse endereço e carrega o SDK da Meta inicializado somente com o `META_WHATSAPP_APP_ID` da conta WhatsApp.
- O login usa `config_id` da configuração **Embedded Signup v4**; nunca tenta selecionar uma versão com `extras.version`. A modalidade Coexistência usa `featureType: whatsapp_business_app_onboarding`.
- O backend só conclui a vinculação depois de receber o código da autorização, WABA ID e Phone Number ID confirmados. Não presume um número se o evento de sessão estiver incompleto.
- A conta já vinculada por Cloud API (incluindo `csi`) continua bloqueada para substituição por um novo onboarding (`HTTP 409`); **não migrar automaticamente**.
- Verifique a modalidade de permissão concedida pela Meta (App Review, Advanced Access e app em modo Live) na conta real antes de liberar o recurso aos demais lojistas.
- **Bloqueio externo atualmente identificado:** `META_WEBHOOK_VERIFY_TOKEN` ausente no projeto Vercel. Não inventar, copiar valores de exemplo nem rotacionar o token do callback que já atende CSI. Configure o mesmo token seguro nas duas plataformas somente após checar a inscrição atual; a integração passa a indicar `ready: true` quando estiver consistente.
- Confira URL HTTPS `https://app.velodelivery.com.br/api/whatsapp-webhook`, domínio OAuth/JS SDK, WABA inscrita no webhook e eventos de `messages` e Coexistência.
- Homologue uma **loja de teste sem conexão atual**: consentimento OAuth → retorno de sessão (WABA e telefone) → registro com PIN apenas se for um número novo → mensagem de entrada → resposta → recibo `delivered/read`.
- A conexão pública só deve ser anunciada como operacional após essa validação real. Verificar também prazo/renovação do token de acesso retornado pelo cadastro.

**Segurança:** nenhum passo acima exige modificar o número ou a sessão existente da Conveniência Santa Isabel.
