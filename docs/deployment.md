# Deployment seguro

## Produção confirmada em 2026-09-16

- Plataforma: Cloudflare Workers Static Assets.
- Serviço: `legal-carina`.
- Ambiente: produção.
- URL: `https://legal-carina.dabranches.workers.dev`.
- Versão visível: `0.10.20`.
- Deployment activo: `af4dd533-6daf-4efe-af87-dd811504c82c`.
- Version ID activo: `bb3d809a-e94b-45ca-be7c-a8e3f6546dd3` (100% do tráfego desde `2026-09-16 10:42:47 UTC`).
- Commit funcional publicado e fonte canónica no GitHub: `main` em `82a0b35b13734c00701dbd5eac62d352aa80f5e7` (PR #35).
- Rollback imediato do frontend: `e0a0442b-c268-4e3d-a00c-0f759708ff19` (0.10.19). A migration `20260916104110_filter_paid_work_without_invoice_evidence` alterou apenas duas funções de leitura no Supabase; reverter o Worker não a desfaz. Não repor a base de dados para reverter apenas o frontend.

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
