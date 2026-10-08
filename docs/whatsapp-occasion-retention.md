# Velo Delivery — Mensagens por ocasião (piloto CSI)

## Agenda (America/Sao_Paulo)

| Janela | Horário SP | Cron UTC | Regras |
| --- | --- | --- | --- |
| quarta com jogo | 17h–17h59 | `0 20 * * 3` | Só com jogo confirmado no Firestore |
| sexta | 17h30–18h29 | `30 20 * * 5` | Abertura do fim de semana |
| sábado | 11h–11h59 | `0 14 * * 6` | Churrasco/almoço |
| domingo | 11h–11h59 | `0 14 * * 0` | Almoço e encontros |

* A precisão da Vercel Hobby é por hora. O sistema aceita a janela de 60 minutos para não descartar um cron atrasado.
* Crons são independentes da rotina de faturamento de `/api/cron-automations`. Não acrescentar o mesmo ciclo de 30/60/90 nela.
* Mensagens reais só saem quando `settings/csi.integrations.whatsapp.lifecycleAutomation.enabled` não é `false`, a loja não está fechada/em férias, há credenciais Meta, opt-in expresso, maioridade confirmada no pedido mais recente e cliente elegível por 30/60/90 dias de inatividade.
* Também considera descadastro `PARAR`, bloqueios, intervalo mínimo de 7 dias entre etapas e um limite compartilhado de 20 tentativas por loja/dia. A prioridade de público considera dias/horários de compras anteriores.
* Os templates enviados são exclusivamente os já aprovados `velo_retencao_30_bebidas`, `velo_retencao_60_bebidas`, `velo_retencao_90_bebidas`, ou mapeamentos aprovados nas configurações. O cron **não** muda a copy do template em função do jogo.
* Aceite da API Meta não comprova entrega; status reais vêm pelos webhooks do WhatsApp.

## Registrar um jogo confirmado de quarta

O cron de quarta **não envia mensagens por padrão**. Ele também valida que o início da partida está entre 45 minutos e 5 horas no futuro. Para habilitar o disparo em uma quarta específica, cadastre em Firestore um documento sob:

`whatsapp_marketing_events/csi_YYYY-MM-DD`

com os campos:

```json
{
  "storeId": "csi",
  "date": "2026-10-14",
  "type": "football_match",
  "active": true,
  "confirmed": true,
  "matchLabel": "Time mandante x Time visitante",
  "kickoffAt": "2026-10-14T21:00:00-03:00",
  "sourceUrl": "https://exemplo.com/tabela-oficial"
}
```

Preencha apenas confrontos realmente verificados em tabela oficial, com data local correta. O exemplo acima ilustra formato, **não é um confronto factual**. O evento pode ser desativado com `active:false`; o fluxo de sexta/sábado/domingo funciona independentemente.

## Testar sem disparos reais

```bash
node --check server/lifecycleDispatch.js
node --test tests/lifecycleSchedule.test.js tests/whatsappMarketingGuard.test.js
```

As invocações reais exigem CRON_SECRET e ocorrem **somente na produção**. Não testar o endpoint diretamente com o segredo em produção, pois isso pode enviar mensagens elegíveis.

## Próxima evolução

Integrar calendário de jogos de fonte licenciada/confiável, validar horário de início, permitir segmentação com consentimento e usar templates específicos aprovados pela Meta. Comparar recompra atribuída a cada janela com testes A/B.
