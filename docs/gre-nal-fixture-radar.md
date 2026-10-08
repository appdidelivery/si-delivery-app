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

## Ativação controlada das mensagens temáticas
As consultas são automáticas. **Os alertas de jogo ficam DESATIVADOS até aprovação de um template dedicado de marketing no WhatsApp Manager** e configuração pelo responsável da loja:

```js
settings/csi.integrations.whatsapp.footballAutomation = {
  enabled: true,
  approvedTemplateName: 'velo_alerta_futebol_csi',
  dailyLimit: 20,
  allowUnsegmented: false
}
```

Template sugerido para submeter à Meta (categoria **MARKETING**, idioma **pt_BR**, 2 variáveis no corpo):

> Tem jogo chegando! ⚽ {{1}} começa {{2}}. Confira a Conveniência Santa Isabel e se programe com antecedência. Para não receber mais nossas ofertas, responda PARAR.

Nunca usar nome/horário da partida sem confirmação. Nenhum alerta é enviado sem o template aprovado e habilitado. Mensagens promovendo bebidas alcoólicas exigem maioridade confirmada e observância às políticas da Meta e legislação brasileira.

Público elegível:
- Opt-in expresso de marketing no pedido e confirmação de 18+ na compra.
- Não optou por `PARAR`, não está bloqueado e loja está aberta.
- Gre-Nal: contatos elegíveis que não selecionaram "sem futebol". Jogos de só um clube: apenas torcedores autodeclarados desse clube ou `both` (ou público sem seleção caso lojista habilite `allowUnsegmented`).
- No máximo 20 tentativas de marketing por loja/dia (cota compartilhada com outras campanhas), sem avisar o mesmo número duas vezes no dia e sem repetir alerta de futebol dentro de 7 dias.

O valor de `approvedTemplateName` **não deve ser criado ficticiamente no Firestore**: primeiro conferir aprovação real da Meta e componentes `body` com dois textos (`{{1}}` jogo; `{{2}}` data e hora).

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
