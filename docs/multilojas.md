# Velo MultiLojas

## Objetivo
Permitir que uma rede mantenha painéis, catálogos, pedidos e configurações independentes por unidade, mas use um único domínio de entrada para o consumidor.

## Decisão de arquitetura do MVP
O roteamento principal é **geográfico**, não por CEP.

Fluxo recomendado:

1. consumidor informa endereço completo ou usa a localização do dispositivo;
2. endereço é convertido em latitude/longitude via Google Maps Geocoding;
3. a Velo calcula a distância em linha reta entre o consumidor e cada unidade;
4. cada unidade possui latitude, longitude e um raio máximo de atendimento;
5. somente unidades cujo raio contém o consumidor são elegíveis;
6. quando mais de uma atende, a mais próxima é recomendada primeiro;
7. no modo híbrido, o consumidor ainda pode escolher outra unidade manualmente;
8. cada unidade continua usando seu próprio painel/storeId.

CEP fica restrito ao checkout e a eventuais fallbacks, não como regra principal de roteamento.

## Configuração
A loja que hospeda o domínio de entrada guarda a configuração pública em:

`stores/{storeId}.multiStore`

Campos principais:

- `enabled`: ativa o localizador na página inicial;
- `networkName`: nome da rede;
- `routingMode`: `hybrid`, `geo` ou `manual`;
- `rememberSelection`: lembra a última unidade escolhida no navegador;
- `units[]`: unidades independentes.

Cada item de `units[]` usa:

- `storeId`;
- `frontendUrl`;
- `name`;
- `description`;
- `address`;
- `lat`;
- `lng`;
- `radiusKm`;
- `enabled`.

A administração fica disponível em:

```
/admin/multilojas
```

## Reuso das Zonas de Entrega já existentes
Ao informar o `storeId` de uma unidade e clicar em **Carregar do painel**, a configuração tenta reaproveitar:

- nome da loja;
- domínio/URL;
- endereço;
- latitude e longitude;
- maior `radius_km` existente em `delivery_zones`.

Assim, lojas que já configuraram Frete por KM não precisam cadastrar novamente a localização básica.

## Busca do endereço do consumidor
O frontend usa:

```
VITE_GOOGLE_MAPS_API_KEY
```

para geocodificação do endereço digitado.

Também existe a opção **Usar minha localização**, via `navigator.geolocation`.

A distância do MVP é calculada localmente com Haversine, evitando uma chamada paga de Distance Matrix para cada unidade.

## Sobreposição de áreas
Se duas ou mais unidades cobrirem o mesmo ponto:

- todas as elegíveis são exibidas;
- a lista é ordenada pela distância;
- a primeira recebe o selo **Mais próxima**.

Na evolução futura, o score pode considerar tempo estimado, capacidade, estoque e taxa de entrega.

## Unidade que também hospeda o Hub
Se uma das unidades usa o mesmo domínio do Hub, o gateway acrescenta:

```
?loja=<storeId>
```

para abrir o catálogo sem entrar em loop.

## Próximas evoluções
1. editor visual de polígonos no mapa;
2. áreas de exclusão/inclusão por bairro;
3. cálculo por rota/tempo de deslocamento quando necessário;
4. organização/rede separada dos tenants;
5. estoque e preço multiunidade sob o mesmo frontend.

## Polígonos
O modelo definitivo deve permitir que o lojista desenhe áreas personalizadas no mapa. O raio permanece como configuração rápida/MVP e também como fallback.
