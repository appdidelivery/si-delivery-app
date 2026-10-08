# Pré-integração de pedidos Velo → Linvix — Mercado Monte Verde

**Status:** código de preparação pronto para homologação; exportação e baixa de estoque **desligadas**. Nenhuma credencial do cliente foi recebida.

## Implementado sem acesso do cliente

- A interface **Preparação de pedidos para o ERP** usa `/api/linvix` com ação `previewOrders`, protegida pelo login Firebase e pelo controle de acesso a cada `storeId`.
- A leitura usa `orders.where('storeId', '==', storeId).limit(200)`. Não varre pedidos de outras lojas.
- A Velo classifica pedidos cancelados/pendentes como não elegíveis e exige status de pedido confirmado, pagamento aprovado e itens consistentes para preparar o rascunho.
- Sem GTIN/EAN ou código Linvix, os produtos exigem mapeamento (IDs internos Velo não são tratados como IDs da Linvix).
- Um envelope interno de pedido (`velo.linvix.draft.v1`) contém referência idempotente `velo:{storeId}:{orderId}`, estoque local, itens e totais; deliberadamente não inclui dados pessoais do cliente e **não é payload da API Linvix**.
- Nenhuma ação de envio de pedido, movimentação de estoque ou ativação automática foi publicada. A interface exibe contadores de revisão de pedidos.
- Testes automatizados `tests/linvix-orders.test.mjs`, via `node --test tests/linvix-orders.test.mjs`.

## Política de segurança

1. **Não enviar pedidos sem confirmar o schema do endpoint com a Linvix.**
2. **Não aceitar status de pagamento "pending" como quitado**. Vendas presenciais/dinheiro requerem regra de negócio acordada, não inferência.
3. **Não utilizar o ID de produto Velo como UUID de produto Linvix.** Exigir mapeamento EAN/código.
4. **Nunca dar baixa manual por padrão**: primeiro confirmar se a criação do pedido na Linvix já movimenta o Estoque Local, pois duas baixas significam prejuízo de inventário.
5. No futuro, a exportação deve usar fila idempotente por `storeId + orderId` com transação/lock, estado `pending / sending / delivered / failed / reconciled`, tentativas controladas e reconciliação com pedidos Linvix. A referência determinística **sozinha** não evita envio duplicado; não ativar até implementar o mecanismo.
6. Não enviar dados pessoais a logs nem mantê-los em rascunhos de auditoria. Se a Linvix exigir dados pessoais, mapear apenas os campos necessários e aplicar controles adequados.

## Confirmação de contrato com a Linvix (após liberação)

A documentação pública informada é `https://api-main.linvix.com/docs`. A estrutura exata da requisição de `POST /v1/private/pedidos/` não pôde ser confirmada de modo confiável sem documentação OpenAPI legível; não foi inventado JSON ou campo obrigatório.

Quando o suporte liberar, validar:

- `client_id`, `client_secret` e `codigo_linvix` por unidade/emitente.
- Estoque Local de cada loja: identificador imutável retornado em `/estoque-local/listar` e o identificador presente em `/estoque-cardex/saldos`.
- Autorização para criação de pedido; estrutura de cliente, pagamento, canal, itens, preços, desconto, frete e localização.
- Identificação de canal `canal_venda_uuid`, exigência de `motivo_uuid`, status e endpoint de consulta/reconciliação.
- Possibilidade de buscar pedido por referência externa, para impedir duplicidade após timeout/retry.
- Se pedido confirmado gera reserva, dedução de saldo ou nenhuma baixa; quando necessário executar `/estoque-movimento/saida`.
- Comportamento de cancelamentos, estornos, devoluções e itens com estoque fracionário.
- Ambiente de homologação, limites de chamada e cobrança por unidade.
- Testar pedido fictício em cada unidade sem interferir no estoque da outra.

## Resultado esperado na homologação

Para cada uma das duas lojas, executar: autenticação → seleção de Estoque Local → auditoria de catálogo → simulação de saldos → confirmação de correspondência de itens → criação de pedido de teste no ERP → verificação da baixa uma única vez → conciliação do saldo de vitrine. Só então considerar a automação.

**Sem qualquer acesso Linvix, o estágio de preparação está pronto, mas a integração real não está homologada.**
