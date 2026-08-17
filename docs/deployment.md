# Deployment seguro

## Produção confirmada em 2026-08-17

- Plataforma: Cloudflare Workers Static Assets.
- Serviço: `legal-carina`.
- Ambiente: produção.
- URL: `https://legal-carina.dabranches.workers.dev`.
- Versão visível: `0.2.3`.
- Deployment activo: `ebcb958a-a49c-4485-acb1-65a055011d5d`.
- Version ID activo: `a0d0f411-a5cc-4d13-80ad-f2524eb08b15` (versão Cloudflare 34, 100% do tráfego).
- Commit funcional documentado: `3a665b7`; a Cloudflare não guarda o SHA Git nos metadados desta versão, pelo que esta associação depende do handover e da sequência temporal, não de prova directa da plataforma.

Estes identificadores devem ser novamente consultados antes de cada publicação; não assumir que permanecem activos.

## Gates obrigatórios

- Pull request revisto; CI, E2E, auditoria de dependências e secret scan verdes.
- Migration testada numa branch Supabase/staging, pgTAP e advisors sem findings críticos.
- Textos legais aprovados, SMTP e redirect URLs configurados.
- Preview sem dados reais e smoke test aprovado.
- Backup/PITR e rollback de base de dados confirmados conforme o plano contratado.

## Promoção

1. Fixar o commit e artefacto aprovados.
2. Aplicar migration aditiva no Supabase; nunca executar reset remoto.
3. Publicar Edge Functions e respectivos segredos backend.
4. Validar login, reset, termos, RLS e auditoria com utilizadores de teste.
5. Publicar os assets no ambiente production somente após aprovação explícita do plano Cloudflare.
6. Monitorizar erros e reverter Worker se o smoke test falhar.

Esta fase não publica a aplicação. Funcionalidades com MFA avançado, timeouts de sessão, PITR, SMTP externo ou observabilidade com retenção podem exigir planos pagos; confirmar preços antes de as ativar.
