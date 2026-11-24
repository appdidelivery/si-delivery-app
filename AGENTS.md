# Instruções para agentes e colaboradores

## EYAGENCIA — Política Global de Deploy v2.0 (24/11/2026)

- Horário: America/Sao_Paulo. Janelas de publicação: 11h30 e 14h30 em dias úteis; 14h30 é o último horário programado. Preferir apenas um deploy de produção por projeto/dia; um segundo somente se necessário, justificado e validado. Após a última janela, aguardar o próximo dia útil, salvo incidente crítico autorizado (vendas, pagamentos, fiscal, segurança ou indisponibilidade).
- Desenvolver em branches de trabalho, acumular alterações e versionar no GitHub; testar localmente/CI antes de consolidar. Não publicar cada commit. Git auto-deploy foi desativado em vercel.json; preservar essa configuração e não reativá-la sem autorização.
- Antes de qualquer publicação, verificar escopo, branch, SHA aprovado, testes de build/lint/funcionais, visual mobile/desktop quando aplicável, integração e possibilidade de rollback. Não publicar se não houver mudanças ou se houver testes pendentes/falhos.
- Consultar Vercel antes de publicar: se o mesmo SHA/ambiente já está READY, reutilizar; se estiver QUEUED/BUILDING, não duplicar. Publicação manual controlada apenas do commit consolidado, em janela aprovada; preview somente quando necessário para aceitação.
- Validar produção e logs durante ao menos 90 minutos após o deploy, com rollback ou correção emergencial se necessário. Não publicar no fim do expediente (17h).
- CMS, posts, preços, produtos, automações e dados dinâmicos continuam operando sem redeploy quando não houver mudança de código. Não desligar cron jobs, integrações ou produção para economizar builds.
- Registrar SHA, URL/ID, status real, testes e pendências de cada release; não afirmar que houve publicação sem verificação.
