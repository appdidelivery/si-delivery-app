# Integração Linvix — Mercado Monte Verde

## Objetivo

Integrar as duas unidades do Mercado Monte Verde à Velo Delivery, mantendo o estoque exibido em cada loja alinhado ao respectivo Estoque Local do ERP Linvix.

## Fluxo técnico

1. Cada painel Velo conecta a conta Linvix com Código Linvix, Client ID e Client Secret.
2. A Velo autentica em `POST /v1/public/auth/aplicacao/token`.
3. A Velo lista os Estoques Locais disponíveis em `POST /v1/private/estoque-local/listar`.
4. Em cada painel, selecionamos o Estoque Local correspondente àquela unidade.
5. A sincronização consulta `GET /v1/private/estoque-cardex/saldos`.
6. Produtos são vinculados prioritariamente por GTIN/EAN/código de barras e, como fallback, por `linvixCode`.
7. A quantidade publicada na Velo é o estoque disponível retornado pelo ERP; saldos negativos são publicados como zero.
8. Produtos sem correspondência ficam contabilizados no painel para correção cadastral.
9. O painel registra última sincronização, quantidade encontrada, atualizada e não correspondente.

## Segurança

- Client Secret não é salvo no documento público de configurações.
- Credenciais ficam em `settings/{storeId}/private/linvix`.
- O endpoint manual `/api/linvix` exige usuário Firebase autenticado e autorização para a loja.
- O endpoint automático `/api/linvix-stock-sync` exige segredo de servidor e reutiliza `CRON_SECRET`.
- A sincronização automática nunca recebe credenciais Linvix pela URL.

## Duas lojas

A arquitetura é multi-tenant. Cada unidade Velo possui seu próprio `storeId`, configuração Linvix e Estoque Local selecionado. Um único agendamento pode executar as duas unidades sequencialmente.

## Estratégia de sincronização

A documentação pública da Linvix não descreve um webhook de saída específico para mudança de estoque. Por isso, a primeira versão usa polling.

Recomendação inicial: sincronização a cada 5 minutos, além do botão manual “Sincronizar estoque agora”. Ajustar a frequência depois de medir volume e eventuais limites informados pela Linvix.

A Velo está atualmente no plano Hobby da Vercel. Para não exigir upgrade apenas por causa da frequência do cron, o endpoint automático foi separado e pode ser acionado por Google Cloud Scheduler ou outro scheduler HTTP confiável.

## Pendências para ativar no Mercado Monte Verde

- Receber `client_id`, `client_secret` e `codigo_linvix`.
- Confirmar se as duas unidades usam a mesma instância/código Linvix ou credenciais distintas.
- Conectar cada painel.
- Identificar e selecionar o Estoque Local correto de cada loja.
- Executar sincronização manual de homologação.
- Revisar itens sem correspondência de GTIN/código.
- Ativar agendamento automático.
- Validar alteração real de estoque no ERP e reflexo em cada vitrine Velo.

## Custos externos

### Linvix

O site público da Linvix não apresenta preço específico da API. “API Linvix e integrações externas” aparece no plano Personalizado, com valor sob consulta. O cliente deve confirmar com a Linvix:
- valor mensal/adicional de acesso à API;
- cobrança por CNPJ, loja ou instância;
- limite de chamadas/rate limit;
- existência de webhook de estoque não documentado publicamente;
- possibilidade de ambiente de homologação.

### Velo / agendamento

Não é necessário migrar a Velo para Vercel Pro apenas para esta integração.

Para o agendamento:
- Google Cloud Scheduler: primeiros 3 jobs por conta de faturamento são gratuitos; acima disso, preço de tabela é US$ 0,10 por job/mês.
- Alternativa sem custo: cron-job.org, adequada para baixo custo, porém sem o mesmo compromisso operacional de um serviço cloud gerenciado.

O consumo adicional de Vercel Functions/Firestore tende a ser pequeno para duas lojas e deve ser acompanhado pela auditoria de custos já existente.

## Status de implementação

- Painel Linvix no Hub de Integrações: existente e conectado à estrutura multi-tenant.
- Autenticação Linvix: alinhada à documentação atual.
- Cofre privado de credenciais: implementado.
- Seleção de Estoque Local por unidade: implementada.
- Sincronização manual: implementada.
- Relatório de produtos correspondentes/não correspondentes: implementado.
- Endpoint seguro de sincronização automática: implementado.
- Produção: depende de homologação com credenciais reais antes da liberação definitiva.
