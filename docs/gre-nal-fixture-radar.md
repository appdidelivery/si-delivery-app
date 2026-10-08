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

## Ativação de mensagens — bloqueio por política Meta

**Somente o radar de partidas pode ficar ativo automaticamente. Nenhum alerta para clientes deve ser habilitado antes de análise expressa de conformidade da conta/empresa.**

A Política de Mensagens do WhatsApp Business (consulta de 08/10/2026) inclui **álcool e tabaco** entre os produtos regulados cuja compra, venda e promoção são proibidas no serviço, independentemente de licença local:
https://business.whatsapp.com/policy/preview?lang=pt_BR

Em consequência, **não sugerir ou ativar templates promocionais de álcool, bebidas ou CTA comercial vinculados à partida**. Mesmo um template aprovado pela Meta pode não conferir elegibilidade à operação. Qualquer mensagem informativa sobre o jogo precisa ser avaliada quanto à conta emissora, finalidade e políticas em vigor.

O módulo de mensagens de futebol permanece **desligado por padrão** e exige, simultaneamente:
- `settings/csi.integrations.whatsapp.footballAutomation.enabled===true`
- `policyClearedForThisStore===true`: revisão documentada das regras atuais e liberação expressa da conta;
- `contentType==='sports_information_only'`: nada de promoção, preço, álcool, cupom, pedido ou chamada comercial;
- `approvedTemplateName` realmente aprovado e com **exatamente 2 parâmetros de texto**, conferidos na conta Meta;
- confirmação de consentimento **separado** `footballAlertsOptIn===true`, aceite geral de WhatsApp, idade 18+, time de interesse, sem opt-out PARAR;
- limite compartilhado 20 tentativas/dia e 7 dias entre alertas do mesmo contato;
- loja aberta, partida atualizada no radar e antes do início.

Modelo estritamente informativo para **avaliação de políticas**, não aprovado:

> Lembrete esportivo solicitado: {{1}} será disputado em {{2}}. Se não quiser receber mais avisos, responda PARAR.

**Não enviar, submeter ou ativar automaticamente** antes de verificar se a própria conta/empresa está autorizada a usar esses modelos em conformidade com as políticas.

A preferência por Grêmio/Internacional e o aceite separado são registrados no checkout, sem disparos automáticos enquanto este bloqueio permanecer.
 
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
