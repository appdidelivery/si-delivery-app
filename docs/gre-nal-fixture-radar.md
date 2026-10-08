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

A preferência do clube é opcional no checkout. Para o template informativo em avaliação, sem CTAs comerciais:

> Lembrete esportivo solicitado: {{1}} será disputado em {{2}}. Se não quiser receber mais avisos, responda PARAR.

Para o fluxo comercial de ocasião do Gre-Nal, criar um **template de marketing específico**, separado do informativo (não reutilizar o informativo para publicidade):

```text
Nome: velo_alerta_futebol_csi
Categoria: MARKETING
Idioma: pt_BR
Cabeçalho: nenhum
Corpo:
⚽ Hoje tem {{1}}! O jogo começa {{2}}.

🥤 Bateu a sede? Confira as opções de bebidas geladas da
Conveniência Santa Isabel e prepare tudo para acompanhar a partida.

Para não receber mais novidades, responda PARAR.
```

A chamada atual da Cloud API envia **exatamente dois parâmetros no corpo**, `{{1}}` = jogo e `{{2}}` = horário da partida em Brasília. Qualquer mudança no número, na ordem ou na posição das variáveis exige ajuste simultâneo no backend. Para o primeiro template, não configurar variáveis no cabeçalho e não configurar botões dinâmicos. Um botão estático pode ser avaliado separadamente na Meta.

**O envio comercial permanece desativado** até que o template esteja realmente aprovado, publicação de produção esteja READY e a conta esteja revisada conforme políticas e legislação. Após isso, um operador autorizado deve configurar em `settings/csi.integrations.whatsapp.footballAutomation`:
```js
{
  enabled: true,
  approvedTemplateName: 'velo_alerta_futebol_csi',
  contentType: 'beverage_marketing',
  policyClearedForThisStore: true,
  regulatedMarketingReviewed: true,
  allowUnsegmented: false,
  dailyLimit: 20
}
```
Esses valores são **instruções futuras**, não autorizações para alterar o Firestore sem a revisão e aprovação. Não enviar mensagens de teste a clientes reais.
 
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

O radar deve encontrar a partida pelo ESPN ID 401841267. Se a fonte for indisponível, o sistema não inventa ou dispara jogo. Não há alertas Meta específicos até o template aprovado.
