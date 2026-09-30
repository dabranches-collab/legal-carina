# Deployment seguro

## 30-09-2026 — versão 0.13.1 publicada e verificada

- Por ordem explícita «publica», PR [#82](https://github.com/dabranches-collab/legal-carina/pull/82) integrado em GitHub `main` no commit funcional `98f73a0378ce426ffb370c5166f907f576827527`. Checkout oficial alinhado com esse commit, branch documental `codex/deployment-record-0.13.1`. CI `36749735234` e secret scan `36749735050` verdes: 55 ficheiros/283 testes unitários, runtime Worker, 152 E2E aprovados/uma omissão condicional e três testes PWA aprovados. Segurança de ficheiros, lint, tipos, suite unitária, runtime, build de produção, três testes PWA e dry-run final também aprovados localmente.
- Worker Cloudflare `legal-carina`, URL `https://legal-carina.dabranches.workers.dev`: deployment ID `2fc58910-fca0-48b6-9e8b-db3f1e84f179`, Version ID `3cd368c4-83e4-4647-864a-630b8f6c0624`, 100% do tráfego desde `2026-09-30T17:26:17.077112Z` (CONFIRMADO por deployments status). `/release-notes.json` confirmou HTTP 200/0.13.1 em 30-09-2026; o browser integrado mostrou «Aplicação actualizada · 0.13.1» com as duas alterações. Rollback frontend: Version ID `ea7bc7a9-ec75-4686-82dd-1cece93e793f` (0.13.0).
- Sociedade e valor/hora da ficha preenchem novos registos, incluindo no atalho Nova despesa, com edição manual por registo. Barra horizontal no fundo visível das tabelas largas, sincronizada e sem sobrepor a paginação. Antes da publicação, a auditoria exigiu os patches transitivos de undici `7.29.1` e `8.10.2`; auditoria final aprovada sem findings altos. Sem migration ou alteração de dados nesta publicação; Supabase manteve como últimas migrations confirmadas directamente `20260928165827` e `20260928165929`. O ensaio num iPhone físico permanece pendente.

## Produção confirmada em 2026-09-29

- Plataforma: Cloudflare Workers Static Assets; serviço `legal-carina`; URL `https://legal-carina.dabranches.workers.dev`.
- Versão 0.13.0: commit funcional `69546655dcf38720c26e99d0fc83426128beaf63` em GitHub `main` (PR #79; CI `36564781739` e secret scan `36564781785` verdes). Deployment `f0a1adbe-4c36-4911-b3d5-fa5cb22e8506`, Version ID `ea7bc7a9-ec75-4686-82dd-1cece93e793f`, 100% do tráfego desde `2026-09-29T12:07:57Z`; HTTP 200/0.13.0 em `12:08:22 UTC`. A política `camera=(self)` permite a captura na própria origem. Rollback do Worker: Version ID `b2ae645d-1b53-4046-8e98-a28802273a9a` (0.12.12).
- Sem migration nesta versão. As últimas migrations remotas confirmadas continuam `20260928165827` e `20260928165929`. A UI publicada foi aberta no browser integrado; a captura e escolha da Fototeca dependem de ensaio num iPhone físico.

## Produção confirmada em 2026-09-28

- Plataforma: Cloudflare Workers Static Assets; serviço `legal-carina`; URL `https://legal-carina.dabranches.workers.dev`.
- Versão 0.12.11: commit funcional publicado `f55e83163c1564a76c1e0b9a0020652cb01ba042` em GitHub `main` (PR #74 e #75), deployment `756a758a-10c2-4a63-8bf5-6835e11f31fc`, Version ID `d7e3032e-9378-4aaa-8453-ef7cc4e0abd6`, 100% do tráfego desde `2026-09-28T17:21:13Z`. Notas online 0.12.11/HTTP 200 em `2026-09-28 17:23:39 UTC`.
- Supabase: migrations remotas `20260928165827` e `20260928165929` aplicadas; ver correspondência local em `docs/database/migration-reconciliation.md`. A versão anterior do Worker para rollback é `db8dded3-c4d6-4555-874d-02e641a17f50` (0.12.10). O rollback do Worker não reverte as funções de leitura da base.

## Produção confirmada em 2026-09-25

- Plataforma: Cloudflare Workers Static Assets.
- Serviço: `legal-carina`.
- Ambiente: produção.
- URL: `https://legal-carina.dabranches.workers.dev`.
- Versão visível: `0.12.8` (notas online confirmadas por HTTP 200).
- Deployment activo: `e592b705-b4a0-40d2-a6f1-6f171d58e883`.
- Version ID activo: `18587752-c567-4818-ae0f-7a2a1ca5e182` (100% do tráfego desde `2026-09-25 12:44:52 UTC`).
- Commit funcional publicado e fonte canónica no GitHub: `main` em `8ec12655f64c2bc7dde2dd0f2bd215c65f2b0161` (PR #67; CI verde).
- Rollback imediato do frontend: `ee689cb4-9c11-4a15-ac22-2e662c4b148e` (0.12.7). A versão 0.12.8 não exigiu nova migration.

Estes identificadores devem ser novamente consultados antes de cada publicação; não assumir que permanecem activos.

## Gates obrigatórios

- Pull request revisto; CI, E2E, auditoria de dependências e secret scan verdes.
- Migration testada numa branch Supabase/staging, pgTAP e advisors sem findings críticos.
- Textos legais aprovados, SMTP e redirect URLs configurados.
- Preview sem dados reais e smoke test aprovado.
- Backup/PITR e rollback de base de dados confirmados conforme o plano contratado. A confirmação tem de incluir a data/hora do último ponto recuperável.
- Exportação/cópia independente dos objectos privados do Storage confirmada: o backup da base contém metadados, mas não recupera ficheiros apagados do Storage.
- Linha de base de utilizadores, pertenças, perfis e permissões comparada com `scripts/audit-continuity.sql`, sem órfãos.

## Promoção

1. Fixar o commit e artefacto aprovados.
2. Aplicar apenas a migration aditiva previamente revista e ensaiada; nunca executar reset remoto, `db push` global ou `migration repair` por suposição.
3. Publicar Edge Functions e respectivos segredos backend.
4. Validar login, reset, termos, RLS e auditoria com utilizadores de teste.
5. Publicar os assets no ambiente production somente após a palavra explícita `publica`.
6. Monitorizar erros e reverter Worker se o smoke test falhar.

Pushes, PRs e a CI não publicam a aplicação. A integração Git Cloudflare está desligada; qualquer automatização futura de deploy deve ser apenas manual, protegida por ambiente/revisor e separada da CI. Funcionalidades com MFA avançado, timeouts de sessão, PITR, SMTP externo ou observabilidade com retenção podem exigir planos pagos; confirmar preços antes de as activar.
