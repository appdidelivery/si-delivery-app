# Velo MultiLojas

## Objetivo
Permitir que uma rede mantenha painéis, catálogos, pedidos e configurações independentes por unidade, mas use um único domínio de entrada para o consumidor.

## MVP
A loja que hospeda o domínio de entrada guarda uma configuração pública em `stores/{storeId}.multiStore`.

Campos principais:

- `enabled`: ativa o seletor na página inicial;
- `networkName`: nome da rede;
- `routingMode`: `hybrid`, `cep` ou `manual`;
- `rememberSelection`: lembra a última unidade escolhida no navegador;
- `units[]`: unidades independentes com `storeId`, `frontendUrl`, nome, descrição e faixas de CEP.

A administração fica disponível em:

```
/admin/multilojas
```

## Fluxo
1. Consumidor acessa o domínio de entrada.
2. Se MultiLojas estiver desativado, a loja funciona como antes.
3. Se estiver ativado, o gateway aparece antes do catálogo.
4. O consumidor informa CEP ou escolhe a unidade, conforme o modo configurado.
5. A Velo redireciona para o frontend da unidade selecionada.
6. Cada unidade continua isolada no seu próprio `storeId`.

## Unidade que também hospeda o Hub
Se uma das unidades usa o mesmo domínio do Hub, o gateway acrescenta `?loja=<storeId>` para abrir o catálogo sem entrar em loop.

## Próximas evoluções
- múltiplas faixas de CEP editáveis por unidade;
- roteamento por latitude/longitude e raio;
- polígonos de cobertura;
- organização/rede separada dos tenants;
- estoque e preço multiunidade sob o mesmo frontend.
