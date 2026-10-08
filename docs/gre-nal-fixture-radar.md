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
- O módulo de envio continua **desligado por padrão**, com proteção por `footballAutomation.enabled`, `policyClearedForThisStore`, `contentType:'sports_information_only'`, `approvedTemplateName`, opt-in esportivo específico, aceite de WhatsApp, maioridade e cota compartilhada de 20 tentativas/dia.

A preferência do clube é opcional no checkout. Para o template informativo em avaliação, sem CTAs comerciais:

> Lembrete esportivo solicitado: {{1}} será disputado em {{2}}. Se não quiser receber mais avisos, responda PARAR.

Se desejarmos passar a mensagens de marketing de bebidas, criar um template e um fluxo separados, com a revisão específica da exceção para o Brasil e das regras aplicáveis. **Não reutilizar o template informativo para propaganda**, e não habilitar o envio sem aprovação e avaliação de elegibilidade.
 
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
