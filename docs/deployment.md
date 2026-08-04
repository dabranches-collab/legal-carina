# Deployment seguro

## Gates obrigatórios

- Pull request revisto; CI, E2E, auditoria de dependências e secret scan verdes.
- Migration testada numa branch Supabase/staging, pgTAP e advisors sem findings críticos.
- Textos legais aprovados, SMTP e redirect URLs configurados.
- Preview sem dados reais e smoke test aprovado.
- Backup/PITR e rollback de base de dados confirmados conforme o plano contratado.

## Promoção

1. Fixar o commit e artefacto aprovados.
2. Aplicar migration aditiva no Supabase; nunca executar reset remoto.
3. Publicar Edge Functions e respetivos segredos backend.
4. Validar login, reset, termos, RLS e auditoria com utilizadores de teste.
5. Publicar os assets no ambiente production somente após aprovação explícita do plano Cloudflare.
6. Monitorizar erros e reverter Worker se o smoke test falhar.

Esta fase não publica a aplicação. Funcionalidades com MFA avançado, timeouts de sessão, PITR, SMTP externo ou observabilidade com retenção podem exigir planos pagos; confirmar preços antes de as ativar.
