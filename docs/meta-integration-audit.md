# Revisão Meta Pixel / Conversions API

## Falhas confirmadas e corrigidas no código

- `Purchase` era disparado antes de salvar o pedido e antes do pagamento online. Agora pagamentos na entrega disparam após a gravação; pagamentos online disparam no rastreio quando o pedido está `paid`.
- Pixel e CAPI não compartilhavam um identificador de evento. Ambos passam a usar o ID do pedido, respectivamente em `eventID` e `event_id`.
- O Pixel dependia de interação ou de oito segundos de espera. Agora inicializa assim que a configuração está disponível, com fila para o carregamento assíncrono.
- O script único impedia inicializar outro Pixel durante navegação entre lojas. A inicialização agora é por ID, com `trackSingle` para direcionar eventos.
- A CAPI não recebia URL, user agent nem cookies de atribuição. Novos pedidos armazenam esse contexto para o webhook; cookies são enviados somente quando disponíveis.
- Telefones nacionais com DDD 55 eram confundidos com números que já continham DDI. A normalização agora considera o comprimento antes de aplicar SHA-256.
- Respostas HTTP de erro eram ignoradas. Agora há validação de `events_received` e logs de status, código e identificador de diagnóstico, sem token ou dados pessoais.
- A chamada de conversões usava Graph API v19.0. Foi atualizada para v26.0, versão indicada no SDK oficial consultado. O token segue no cabeçalho de autorização.

## Validação local

`node --test lib/metaConversions.test.js src/utils/metaPixel.test.js`: cinco testes aprovados, com chamadas Meta simuladas.

`npm run build`: aprovado, com aviso de tamanho de bundle.

ESLint dos quatro novos módulos e testes: aprovado. A verificação incluindo `Home.jsx`, `Tracking.jsx` e `api/index.js` reporta 18 erros e 37 avisos em trechos existentes; o lint desses arquivos não está aprovado.

## Limites e próximos passos operacionais

- Alterações locais, ainda não publicadas. Não foi enviado evento real para a Meta nem validado o token de nenhuma loja.
- A CAPI existente continua sendo chamada apenas pelo webhook de aprovação do Mercado Pago em `api/index.js`. Pagamentos na entrega e outros gateways não ganharam envio pelo servidor nesta correção; isso exige ampliar os gatilhos de conversão.
- Não há fila persistente de retentativas CAPI. Uma rejeição agora fica visível nos logs, mas uma falha após confirmar o pagamento ainda pode perder o evento do servidor.
- Pedidos antigos não possuem o novo contexto do navegador. O Pixel de confirmação depende do cliente abrir o rastreio; bloqueadores também podem impedir seu envio.
- O IP do cliente não é capturado. O IP do webhook pertence ao provedor de pagamentos e não deve substituí-lo.
- Após publicar, verificar uma compra aprovada em “Testar eventos” no Gerenciador de Eventos: mesmo ID de pedido no navegador e servidor, valor consistente e nenhuma compra para pagamento recusado. Conferir também um pedido com pagamento na entrega.

Referências primárias: [campos e deduplicação no SDK oficial da Meta](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/serverside/event.py) e [versão da API no SDK](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/apiconfig.py).
