# Radar de futebol — Velo Delivery / Conveniência Santa Isabel

## Escopo inicial
- Inter e Grêmio **masculinos**, identificados por IDs de equipe exatos.
- Competições: Brasileiro Série A (`bra.1`), Copa do Brasil (`bra.copa_do_brazil`), CONMEBOL Libertadores e Sul-Americana.
- Priorização: Gre-Nal > partidas de um dos clubes. Outros clubes podem ser adicionados depois.
- Fonte estruturada inicial: placar/calendário ESPN (endpoint JSON público, **não oficial, sujeito a mudanças**). Consulta diária por datas e competição; datas em `America/Sao_Paulo`.
- Google pode auxiliar a **validação editorial**, mas resultados do Google Search não são uma API estável de calendário; a Google Custom Search JSON API está fechada para novas adesões em 2026. Para escala, considerar serviço licenciado de dados esportivos e conferência no site da CBF/CONMEBOL/clubes.

## Agendamentos
| Rota (mesma Function `api/index.js`) | Cron UTC | Brasil |
|---|---|---|
| `/api/football-radar` | `0 12 * * *` | consulta às 09h, diariamente |
| `/api/football-alert-early` | `0 17 * * *` | campanha condicional às 14h |
| `/api/football-alert-late` | `0 21 * * *` | campanha condicional às 18h |

No Vercel Hobby a execução pode acontecer ao longo da hora programada, sem precisão de minutos. Se a partida já começou, está distante, foi adiada ou a fonte não atualizou nas últimas 30 horas, a campanha é abortada. Não é necessário comprar API esportiva nesta fase, porém há consumo de execução Vercel, rede e leituras/gravações Firebase.

## Armazenamento
- `football_fixtures/<competition_eventId>`: jogos com data, horário, clubes, fonte e última verificação.
- `whatsapp_marketing_events/csi_YYYY-MM-DD`: partida prioritária do dia e seus detalhes.
- `football_radar_status/csi`: data de consulta, quantidade de partidas detectadas e erros.
- `whatsapp_football_contacts/csi_<phonehash>`: último aviso por contato para impedir repetição.

## Ativação de mensagens — exceção regulamentada do Brasil

A [Política Empresarial atual do WhatsApp](https://whatsappbusiness.com/pt-br/policy/) permite, **na Plataforma/API do WhatsApp Business**, mensagens sobre bebidas alcoólicas **no Brasil** entre os países autorizados. A exceção **não** se estende ao aplicativo WhatsApp Business comum nem a recursos comerciais que permitem comprar/vender diretamente produtos regulados no WhatsApp. A política exige conformidade com leis locais, licenças e códigos setoriais, controle geográfico, medidas técnicas/organizacionais de maioridade e **nenhum destinatário menor de 18 anos**. Consultado em 08/10/2026, seção 5, "Álcool – Países permitidos".

Portanto:
- O radar de partidas é uma coleta informativa e pode funcionar sem enviar qualquer mensagem.
- Antes de ativar alertas de futebol para clientes da Conveniência Santa Isabel, confirmar em revisão da conta da Meta, licenças locais, consentimento para WhatsApp, maioridade e **aprovação exata do template**. A aprovação por si só não cobre outras exigências.
- Manter a separação entre aviso esportivo, eventual marketing permitido pela exceção brasileira e venda efetiva: **não usar o WhatsApp como meio de transação de produtos regulados**.
- O módulo de envio continua **desligado por padrão** e exige `footballAutomation.enabled`, `policyClearedForThisStore`, `approvedTemplateName`, opt-in esportivo específico, aceite de WhatsApp, maioridade e cota compartilhada de 20 tentativas/dia. Para mensagens comerciais sobre bebidas, exige ainda `contentType:'beverage_marketing'` e `regulatedMarketingReviewed:true` (revisão explícita de elegibilidade da conta, idade, localização e das regras da Meta).

## Um único modelo para futebol, fim de semana e churrasco

A preferência por Grêmio/Inter é opcional no checkout e utilizada **somente** para segmentação esportiva. O template principal **não** menciona Grêmio, Inter, Gre-Nal ou jogos específicos. A ocasião entra na variável `{{1}}` e o restante do texto é fixo.

**Modelo Meta a criar:**
- Nome exato: `velo_momentos_bebidas`
- Categoria: **MARKETING**
- Idioma: **pt_BR**
- Cabeçalho: **nenhum**
- Corpo: **uma única variável** (`{{1}}`), sem parâmetros de data ou time
- Botões: nenhum dinâmico na primeira versão

```text
🥤 {{1}} combina com bebida gelada!

Vai reunir o pessoal ou aproveitar um momento especial?

Na Conveniência Santa Isabel você encontra opções para matar a sede e deixar tudo mais prático.

🛵 Confira nosso cardápio e programe seu pedido!

Para não receber mais novidades, responda PARAR.
```

### Preenchimento automático da variável de ocasião

| Canal / janela | Valor para {{1}} |
|---|---|
| Quarta-feira com jogo verificado | Um bom jogo de futebol |
| Sexta, 17h30 | O início do fim de semana |
| Sábado, 11h | Um encontro com os amigos |
| Domingo, 11h | Um churrasco de domingo |
| Alerta específico de partida de Grêmio ou Inter | Um bom jogo de futebol |

O modelo pode ser reaproveitado em inúmeras datas; a mensagem mantém o mesmo contrato técnico (uma variável de texto). O calendário de partidas serve somente para definir **quando** e **para quem** avisar, sem necessidade de atualizar o template ao mudar o confronto. O backend não prevê disparo sobre uma partida não confirmada.

### Ativação após aprovação — duas rotinas, um mesmo template

**Jornada de retenção 30/60/90**: continuará usando os três modelos atuais **até** o responsável configurar, em `settings/csi.integrations.whatsapp.lifecycleAutomation`:

```js
{
  occasionTemplateName: 'velo_momentos_bebidas',
  occasionTemplateApproved: true,
  occasionTemplateBodyVariableCount: 1,
  marketingPolicyReviewed: true
}
```

É uma configuração opcional: não remover os três templates aprovados existentes, mantendo fallback seguro. As janelas de quarta/sexta/sábado/domingo continuam respeitando a regra de 30/60/90 dias, opt-in, confirmação de idade, frequência mínima e cota compartilhada.

**Alerta de futebol para inscritos no assunto**: usa a mesma variável de ocasião, mas segue um público distinto com aceite expresso de jogos. Somente habilitar após aprovação, validação da conta e da versão de produção, em `settings/csi.integrations.whatsapp.footballAutomation`:

```js
{
  enabled: true,
  approvedTemplateName: 'velo_momentos_bebidas',
  templateBodyVariableCount: 1,
  contentType: 'beverage_marketing',
  policyClearedForThisStore: true,
  regulatedMarketingReviewed: true,
  allowUnsegmented: false,
  dailyLimit: 20
}
```

Esses exemplos descrevem configuração **futura**, não são alteração ou autorização de envio. A Meta precisa aprovar o modelo exato, inclusive o número de parâmetros. Exigir aceite, maioridade, geografia/leis/política e opt-out. **Não enviar mensagens sem consentimento**.

### Limite do público no MVP

O modelo reutilizável foi preparado para todos os dias temáticos, porém **as campanhas de sexta/sábado/domingo da jornada continuam segmentadas aos clientes elegíveis de 30/60/90 dias sem compras**. Elas ainda **não** constituem um disparo semanal para toda a base. O envio baseado em jogos tem aceite esportivo separado e depende do radar e da liberação acima.

## Homologação e segurança
```sh
node --check server/footballRadar.js
node --check server/footballAlerts.js
node --test tests/footballFixtures.test.js
```
Nenhum script de teste aciona Meta ou Firestore reais. A chamada do radar exige `CRON_SECRET` e somente grava dados de jogos. O alerta exige também `footballAutomation.enabled===true` e template cadastrado. `user-agent` nunca autentica crons.

## Gre-Nal de 11/10/2026
Grêmio x Internacional — 17h30 (Brasília), Arena do Grêmio, confirmado oficialmente pela CBF:
https://www.cbf.com.br/futebol-brasileiro/jogos/campeonato-brasileiro/serie-a/2026/gremio-x-internacional/832187

O radar deve encontrar a partida pelo ESPN ID 401841267. Se a fonte for indisponível, o sistema não inventa ou dispara jogo. Mesmo em Gre-Nal, o template usa a frase genérica de futebol; não é necessário criar outro modelo. Não há alertas Meta específicos até aprovação e ativação controlada.
