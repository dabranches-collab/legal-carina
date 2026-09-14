# Deployment seguro

## Produção confirmada em 2026-09-14

- Plataforma: Cloudflare Workers Static Assets.
- Serviço: `legal-carina`.
- Ambiente: produção.
- URL: `https://legal-carina.dabranches.workers.dev`.
- Versão visível: `0.10.14`.
- Deployment activo: `e528b0a7-88b0-4b51-83b5-41d9e55fb82b`.
- Version ID activo: `455d288f-3bf0-4e63-956a-136ba2c0a203` (100% do tráfego desde 17:51:47 UTC).
- Commit funcional publicado e fonte canónica no GitHub: `main` em `b70aa7123d5e681402d2c7ca12004d909b752443`.
- A versão 0.10.15 está apenas em preparação local/GitHub e não deve ser confundida com produção.

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
