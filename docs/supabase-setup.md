# Configuração Supabase

Projeto: `vtvvqyebigflgqccbqsw`.

## Local

O signup está desativado. O Auth local usa PKCE, rotação de refresh tokens e password mínima de 12 caracteres. Inicie a stack com a CLI/Docker, aplique migrations e use o Mailpit local para testar convites e recuperação.

```powershell
supabase start
supabase db reset
supabase test db
supabase functions serve --env-file supabase\.env.local
```

`supabase\.env.local` não é versionado e contém apenas segredos das Edge Functions, incluindo `ALLOWED_ORIGINS`, `SECURITY_EVENT_HASH_SALT` e os segredos fornecidos automaticamente pelo Supabase. A service role nunca entra no frontend.

## Documentos legais

Não existem textos legais seed. Um administrador publica atomicamente as três versões aprovadas através de `admin-users` com a ação `publish_legal_documents`. Até isso acontecer todos os acessos a dados de negócio permanecem bloqueados.

## Utilizadores e tipos

Utilizadores são convidados pela ação `invite_user`; não existe endpoint público de criação. Os códigos internos mapeiam para os perfis funcionais: owner=administrador, admin=gestor, billing=financeiro, professional=advogado, viewer=consulta e auditor=auditor.

Depois de aplicar a migration numa branch/staging, gere novamente os tipos:

```powershell
supabase gen types typescript --project-id vtvvqyebigflgqccbqsw | Set-Content -Encoding utf8 src\types\database.types.ts
```

Antes de produção: executar pgTAP, `supabase db advisors`, rever RLS, configurar SMTP próprio e URLs autorizadas. SMTP próprio e controlos avançados de duração/sessão podem implicar custos; confirmar o plano antes.

## Storage

O original importado, se for conservado, usa o bucket privado `legal-imports`, com limite declarativo de 50 MB, MIME types `.xlsx`/`.csv` e políticas por `firm_id`. A migration apenas declara esta configuração: ainda não foi aplicada remotamente e exige revisão de retenção, tamanho e custos antes da promoção.
