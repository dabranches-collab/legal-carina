# Deployment seguro

## Produção confirmada em 2026-09-16

- Plataforma: Cloudflare Workers Static Assets.
- Serviço: `legal-carina`.
- Ambiente: produção.
- URL: `https://legal-carina.dabranches.workers.dev`.
- Versão visível: `0.11.0` (notas online confirmadas por HTTP 200).
- Deployment activo: `bebd45c9-795e-455d-80ad-32b0aec8fec2`.
- Version ID activo: `4fc9aa65-9c37-42fd-871f-14d024e6d86d` (100% do tráfego desde `2026-09-16 19:10:46 UTC`).
- Commit funcional publicado e fonte canónica no GitHub: `main` em `ba2a67bfbcd1129d60472456cf82c7c101f493eb` (PR #42; CI verde).
- Rollback imediato do frontend: `13705d2c-925f-4848-a3a0-ff1b599b8d4b` (0.10.21). A migration de leitura agregada `20260916182123` foi aplicada isoladamente e confirmada antes do deploy frontend.

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
